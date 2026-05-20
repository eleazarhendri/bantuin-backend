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

// Status yang membolehkan user request pembatalan (setelah accepted)
const USER_CANCEL_REQUEST_ALLOWED = [
  'accepted', 'shopping', 'on_the_way', 'diagnosis', 'in_progress', 'ready_pickup',
];

// Batas waktu mitra merespons request pembatalan (5 menit)
const CANCEL_REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

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
      cancellation_status: (order as any).cancellationStatus ?? null,
      cancellation_reason: (order as any).cancellationReason ?? null,
      cancellation_requested_at: (order as any).cancellationRequestedAt ?? null,
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

    // ── Cek & potong saldo user jika bayar via wallet ──────────────────────
    if (dto.paymentMethod === 'wallet') {
      const userWallet = await this.prisma.wallet.findUnique({
        where: { userId },
      });

      const currentBalance = userWallet?.balance ?? 0;

      if (currentBalance < totalAmount) {
        throw new BadRequestException(
          `Saldo tidak cukup. Saldo kamu: Rp ${Math.floor(currentBalance).toLocaleString('id-ID')}, dibutuhkan: Rp ${Math.floor(totalAmount).toLocaleString('id-ID')}`,
        );
      }

      // Potong saldo user
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId },
          data: { balance: { decrement: totalAmount } },
        }),
        this.prisma.walletTransaction.create({
          data: {
            walletId: userWallet!.id,
            amount: totalAmount,
            type: 'DEBIT',
            description: `Pembayaran pesanan ke ${mitra.name ?? 'Mitra'} - ${dto.categoryName}`,
          },
        }),
      ]);

      this.logger.log(
        `[WALLET] Potong saldo user=${userId} -${totalAmount} untuk pesanan ke mitra=${dto.mitraId}`,
      );
    }

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

  // ── Cancel Order (User) — dengan refund wallet otomatis ──────────────────

  async cancelOrder(orderId: number, userId: number) {
    return this.cancelOrderWithRefund(orderId, userId);
  }

  // ── Request Pembatalan (User — setelah accepted) ───────────────────────────

  /**
   * User mengajukan permintaan pembatalan setelah pesanan diterima mitra.
   * Mitra punya 5 menit untuk merespons.
   * Jika tidak direspons dalam 5 menit → otomatis TIDAK bisa dibatalkan.
   */
  async requestCancellation(orderId: number, userId: number, reason?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    if (order.userId !== userId) throw new ForbiddenException('Bukan pesananmu');

    if (!USER_CANCEL_REQUEST_ALLOWED.includes(order.status)) {
      throw new BadRequestException(
        'Pembatalan hanya bisa diajukan saat pesanan sedang diproses mitra.',
      );
    }

    const cancellationStatus = (order as any).cancellationStatus;
    if (cancellationStatus === 'requested') {
      throw new BadRequestException('Permintaan pembatalan sudah diajukan. Tunggu respons mitra.');
    }

    const now = new Date();
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        cancellationStatus: 'requested',
        cancellationReason: reason ?? null,
        cancellationRequestedAt: now,
      } as any,
    });

    const formatted = await this.formatOrder(updated);

    // Notifikasi real-time ke mitra
    this.gateway.notifyOrderStatusUpdated(order.userId, order.mitraId, formatted);

    // Notifikasi persisten ke mitra
    const userRecord = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.notificationsService.notifyOrderStatusUpdate({
      userId: order.mitraId,
      orderId,
      mitraName: userRecord?.name ?? 'User',
      newStatus: 'cancellation_requested',
    });

    this.logger.log(
      `[ORDER] Cancellation requested: id=${orderId} userId=${userId} reason="${reason}"`,
    );

    return formatted;
  }

  /**
   * Mitra merespons permintaan pembatalan dari user.
   * - approve → pesanan dibatalkan + refund ke user
   * - reject  → pesanan lanjut, cancellationStatus = 'rejected'
   *
   * Hanya bisa direspons dalam 5 menit sejak request.
   * Setelah 5 menit → otomatis dianggap ditolak (tidak bisa dibatalkan).
   */
  async respondCancellation(
    orderId: number,
    mitraId: number,
    approve: boolean,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    if (order.mitraId !== mitraId) throw new ForbiddenException('Bukan pesananmu');

    const cancellationStatus = (order as any).cancellationStatus;
    const cancellationRequestedAt = (order as any).cancellationRequestedAt as Date | null;

    if (cancellationStatus !== 'requested') {
      throw new BadRequestException('Tidak ada permintaan pembatalan aktif untuk pesanan ini.');
    }

    // Cek timeout 5 menit
    if (cancellationRequestedAt) {
      const elapsed = Date.now() - cancellationRequestedAt.getTime();
      if (elapsed > CANCEL_REQUEST_TIMEOUT_MS) {
        // Timeout — otomatis reject, update status
        await this.prisma.order.update({
          where: { id: orderId },
          data: { cancellationStatus: 'expired' } as any,
        });
        throw new BadRequestException(
          'Waktu respons pembatalan sudah habis (5 menit). Pesanan tidak dapat dibatalkan.',
        );
      }
    }

    if (approve) {
      // Approve → batalkan pesanan + refund
      const updated = await this.cancelOrderWithRefund(orderId, order.userId, true);

      // Update cancellationStatus ke approved
      await this.prisma.order.update({
        where: { id: orderId },
        data: { cancellationStatus: 'approved' } as any,
      });

      this.logger.log(`[ORDER] Cancellation APPROVED by mitra=${mitraId} for order=${orderId}`);
      return updated;
    } else {
      // Reject → lanjutkan pesanan
      const updated = await this.prisma.order.update({
        where: { id: orderId },
        data: { cancellationStatus: 'rejected' } as any,
      });

      const formatted = await this.formatOrder(updated);
      this.gateway.notifyOrderStatusUpdated(order.userId, mitraId, formatted);

      this.logger.log(`[ORDER] Cancellation REJECTED by mitra=${mitraId} for order=${orderId}`);
      return formatted;
    }
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

  // ── Get Wallet (Mitra — saldo + riwayat lengkap) ──────────────────────────

  async getWallet(userId: number) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 100, // ambil 100 transaksi untuk grafik 30 hari
        },
      },
    });

    if (!wallet) {
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

  // ── Get User Wallet (User — hanya saldo untuk checkout) ───────────────────

  async getUserWallet(userId: number) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    return {
      balance: wallet?.balance ?? 0,
    };
  }

  // ── Withdraw Saldo Mitra ───────────────────────────────────────────────────

  async withdrawWallet(userId: number, amount: number): Promise<object> {
    if (amount <= 0) {
      throw new BadRequestException('Jumlah penarikan harus lebih dari 0');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet tidak ditemukan');
    }

    if (wallet.balance < amount) {
      throw new BadRequestException(
        `Saldo tidak cukup. Saldo tersedia: Rp ${Math.floor(wallet.balance).toLocaleString('id-ID')}`,
      );
    }

    const MIN_WITHDRAW = 10_000;
    if (amount < MIN_WITHDRAW) {
      throw new BadRequestException(
        `Minimum penarikan adalah Rp ${MIN_WITHDRAW.toLocaleString('id-ID')}`,
      );
    }

    const [updatedWallet, tx] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: 'DEBIT',
          description: `Penarikan saldo ke rekening bank`,
        },
      }),
    ]);

    this.logger.log(
      `[WALLET] Withdraw userId=${userId} -${amount} | sisa=${updatedWallet.balance}`,
    );

    return {
      success: true,
      withdrawn: amount,
      new_balance: updatedWallet.balance,
      transaction_id: tx.id,
    };
  }

  // ── Cancel Order (User) dengan refund wallet ───────────────────────────────

  async cancelOrderWithRefund(orderId: number, userId: number, skipStatusCheck = false) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    if (order.userId !== userId) {
      throw new ForbiddenException('Kamu bukan pemilik pesanan ini');
    }
    if (!skipStatusCheck && !USER_CANCEL_ALLOWED.includes(order.status)) {
      throw new BadRequestException(
        'Pesanan hanya bisa dibatalkan saat masih pending',
      );
    }

    // Cek apakah ada transaksi DEBIT wallet untuk pesanan ini
    const userWallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (userWallet) {
      // Cari transaksi debit terkait pesanan ini (berdasarkan deskripsi)
      // Refund total amount ke wallet user
      const debitTx = await this.prisma.walletTransaction.findFirst({
        where: {
          walletId: userWallet.id,
          type: 'DEBIT',
          description: { contains: order.categoryName },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (debitTx) {
        await this.prisma.$transaction([
          this.prisma.wallet.update({
            where: { id: userWallet.id },
            data: { balance: { increment: order.totalAmount } },
          }),
          this.prisma.walletTransaction.create({
            data: {
              walletId: userWallet.id,
              amount: order.totalAmount,
              type: 'CREDIT',
              description: `Refund pembatalan pesanan #${orderId} - ${order.categoryName}`,
              orderId,
            },
          }),
        ]);

        this.logger.log(
          `[WALLET] Refund user=${userId} +${order.totalAmount} dari pembatalan order=${orderId}`,
        );
      }
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    const formatted = await this.formatOrder(updated);
    this.gateway.notifyOrderCancelled(userId, order.mitraId, formatted);

    return formatted;
  }
}
