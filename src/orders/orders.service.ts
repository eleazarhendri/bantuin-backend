import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from './orders.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order } from '@prisma/client';

const PLATFORM_COMMISSION = 0.08;

const MITRA_ALLOWED_STATUSES = [
  'accepted', 'shopping', 'on_the_way', 'diagnosis',
  'in_progress', 'ready_pickup', 'done', 'cancelled',
];

const USER_CANCEL_ALLOWED = ['pending'];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: OrdersGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Format order untuk response — include nama user & mitra.
   */
  private async formatOrder(order: Order) {
    const [user, mitra] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: order.userId } }),
      this.prisma.user.findUnique({
        where: { id: order.mitraId },
        include: { mitraProfile: true },
      }),
    ]);

    return {
      id: order.id,
      user_id: order.userId,
      mitra_id: order.mitraId,
      mitra_name: mitra?.name ?? '',
      mitra_avatar_url: mitra?.photoUrl ?? null,
      customer_name: user?.name ?? '',
      category_id: order.categoryId,
      category_name: order.categoryName,
      status: order.status,
      item_description: order.itemDescription,
      store_name: order.storeName ?? null,
      notes: order.notes ?? null,
      photo_url: order.photoUrl ?? null,
      item_budget: order.itemBudget,
      service_fee: order.serviceFee,
      platform_fee: order.platformFee,
      total_amount: order.totalAmount,
      created_at: order.createdAt,
      accepted_at: order.acceptedAt ?? null,
      completed_at: order.completedAt ?? null,
      is_reviewed: order.isReviewed,
    };
  }

  // ── Create Order ───────────────────────────────────────────────────────────

  async createOrder(userId: number, dto: CreateOrderDto) {
    // Validasi mitra ada dan memang mitra
    const mitra = await this.prisma.user.findUnique({
      where: { id: dto.mitraId },
    });

    if (!mitra || !mitra.isMitra) {
      throw new NotFoundException('Mitra tidak ditemukan atau belum aktif');
    }

    // Hitung biaya
    const platformFee = (dto.itemBudget + dto.serviceFee) * PLATFORM_COMMISSION;
    const totalAmount = dto.itemBudget + dto.serviceFee + platformFee;

    const order = await this.prisma.order.create({
      data: {
        userId,
        mitraId: dto.mitraId,
        categoryId: dto.categoryId,
        categoryName: dto.categoryName,
        itemDescription: dto.itemDescription,
        storeName: dto.storeName,
        notes: dto.notes,
        photoUrl: dto.photoUrl,
        itemBudget: dto.itemBudget,
        serviceFee: dto.serviceFee,
        platformFee,
        totalAmount,
        status: 'pending',
      },
    });

    this.logger.log(
      `[ORDER] Dibuat: id=${order.id} userId=${userId} mitraId=${dto.mitraId} total=${totalAmount}`,
    );

    const formatted = await this.formatOrder(order);

    // Notifikasi real-time ke mitra (WebSocket)
    this.gateway.notifyMitraNewOrder(dto.mitraId, formatted);

    // Notifikasi persisten ke DB
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.notificationsService.notifyNewOrder({
      mitraId: dto.mitraId,
      orderId: order.id,
      userName: user?.name ?? 'User',
      categoryName: dto.categoryName,
    });

    return formatted;
  }

  // ── Get Orders by User ─────────────────────────────────────────────────────

  async getOrdersByUser(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(orders.map((o) => this.formatOrder(o)));
  }

  // ── Get Orders by Mitra ────────────────────────────────────────────────────

  async getOrdersByMitra(mitraId: number) {
    const orders = await this.prisma.order.findMany({
      where: { mitraId },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(orders.map((o) => this.formatOrder(o)));
  }

  // ── Get Single Order ───────────────────────────────────────────────────────

  async getOrderById(orderId: number, requesterId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');

    // Hanya user atau mitra yang terlibat yang bisa lihat
    if (order.userId !== requesterId && order.mitraId !== requesterId) {
      throw new ForbiddenException('Kamu tidak punya akses ke pesanan ini');
    }

    return this.formatOrder(order);
  }

  // ── Update Status (Mitra) ──────────────────────────────────────────────────

  async updateOrderStatus(
    orderId: number,
    mitraId: number,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    if (order.mitraId !== mitraId) {
      throw new ForbiddenException('Kamu bukan mitra untuk pesanan ini');
    }
    if (!MITRA_ALLOWED_STATUSES.includes(dto.status)) {
      throw new BadRequestException('Status tidak valid');
    }

    // Tentukan timestamps berdasarkan status baru
    const now = new Date();
    const updateData: Record<string, unknown> = { status: dto.status };

    if (dto.status === 'accepted') updateData.acceptedAt = now;
    if (dto.status === 'done') {
      updateData.completedAt = now;
      // Kredit saldo mitra saat pesanan selesai
      await this.creditMitraWallet(mitraId, order.id, order.serviceFee);
    }
    if (dto.status === 'cancelled') updateData.cancelledAt = now;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    this.logger.log(
      `[ORDER] Status update: id=${orderId} ${order.status} → ${dto.status} by mitra=${mitraId}`,
    );

    const formatted = await this.formatOrder(updated);

    // Notifikasi real-time ke user & mitra (WebSocket)
    if (dto.status === 'cancelled') {
      this.gateway.notifyOrderCancelled(order.userId, mitraId, formatted);
    } else {
      this.gateway.notifyOrderStatusUpdated(order.userId, mitraId, formatted);
    }

    // Notifikasi persisten ke DB untuk user
    const mitraUser = await this.prisma.user.findUnique({ where: { id: mitraId } });
    await this.notificationsService.notifyOrderStatusUpdate({
      userId: order.userId,
      orderId: orderId,
      mitraName: mitraUser?.name ?? 'Mitra',
      newStatus: dto.status,
    });

    // Notifikasi saldo jika pesanan selesai
    if (dto.status === 'done') {
      await this.notificationsService.notifyBalanceCredited({
        mitraId,
        amount: order.serviceFee * (1 - PLATFORM_COMMISSION),
        orderId,
      });
    }

    return formatted;
  }

  // ── Cancel Order (User) ────────────────────────────────────────────────────

  async cancelOrder(orderId: number, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    if (order.userId !== userId) {
      throw new ForbiddenException('Kamu bukan pemilik pesanan ini');
    }
    if (!USER_CANCEL_ALLOWED.includes(order.status)) {
      throw new BadRequestException(
        'Pesanan hanya bisa dibatalkan saat masih pending',
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    const formatted = await this.formatOrder(updated);
    this.gateway.notifyOrderCancelled(userId, order.mitraId, formatted);

    return formatted;
  }

  // ── Wallet: Kredit Mitra ───────────────────────────────────────────────────

  private async creditMitraWallet(
    mitraId: number,
    orderId: number,
    serviceFee: number,
  ) {
    // Upsert wallet — buat jika belum ada
    const wallet = await this.prisma.wallet.upsert({
      where: { userId: mitraId },
      create: { userId: mitraId, balance: 0 },
      update: {},
    });

    // Mitra dapat service fee dikurangi platform commission
    const mitraEarning = serviceFee * (1 - PLATFORM_COMMISSION);

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: mitraEarning } },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: mitraEarning,
          type: 'CREDIT',
          description: `Pendapatan dari pesanan #${orderId}`,
          orderId,
        },
      }),
    ]);

    this.logger.log(
      `[WALLET] Kredit mitra=${mitraId} +${mitraEarning} dari order=${orderId}`,
    );
  }

  // ── Get Wallet ─────────────────────────────────────────────────────────────

  async getWallet(userId: number) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!wallet) {
      // Return wallet kosong jika belum ada
      return { balance: 0, transactions: [] };
    }

    return {
      balance: wallet.balance,
      transactions: wallet.transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        order_id: t.orderId,
        created_at: t.createdAt,
      })),
    };
  }
}
