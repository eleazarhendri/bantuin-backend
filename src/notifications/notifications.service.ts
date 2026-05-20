import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Notification } from '@prisma/client';

export type NotifType = 'order' | 'chat' | 'balance' | 'system' | 'promo';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Buat notifikasi ────────────────────────────────────────────────────────

  async create(params: {
    userId: number;
    type: NotifType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<Notification> {
    const notif = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data ? JSON.stringify(params.data) : null,
      },
    });

    this.logger.log(
      `[NOTIF] Created: userId=${params.userId} type=${params.type} title="${params.title}"`,
    );

    return notif;
  }

  // ── Ambil notifikasi user ──────────────────────────────────────────────────

  async getByUser(userId: number, limit = 30) {
    const notifs = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifs.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data ? JSON.parse(n.data) : null,
      is_read: n.isRead,
      created_at: n.createdAt,
    }));
  }

  // ── Tandai satu notifikasi sebagai dibaca ──────────────────────────────────

  async markRead(notifId: number, userId: number) {
    return this.prisma.notification.updateMany({
      where: { id: notifId, userId },
      data: { isRead: true },
    });
  }

  // ── Tandai semua notifikasi user sebagai dibaca ────────────────────────────

  async markAllRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // ── Hitung unread ──────────────────────────────────────────────────────────

  async countUnread(userId: number): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // ── Helper: notifikasi pesanan baru ke mitra ───────────────────────────────

  async notifyNewOrder(params: {
    mitraId: number;
    orderId: number;
    userName: string;
    categoryName: string;
  }) {
    return this.create({
      userId: params.mitraId,
      type: 'order',
      title: 'Pesanan Baru Masuk! 🛎️',
      body: `${params.userName} memesan layanan ${params.categoryName}. Segera konfirmasi!`,
      data: { order_id: params.orderId },
    });
  }

  // ── Helper: notifikasi update status ke user ───────────────────────────────

  async notifyOrderStatusUpdate(params: {
    userId: number;
    orderId: number;
    mitraName: string;
    newStatus: string;
  }) {
    const statusLabel: Record<string, string> = {
      accepted: 'menerima pesananmu',
      shopping: 'sedang berbelanja',
      on_the_way: 'sedang dalam perjalanan',
      diagnosis: 'sedang mendiagnosis',
      in_progress: 'sedang mengerjakan',
      ready_pickup: 'siap diambil',
      done: 'menyelesaikan pesananmu ✅',
      cancelled: 'membatalkan pesanan',
    };

    const label = statusLabel[params.newStatus] ?? `mengupdate status ke ${params.newStatus}`;

    return this.create({
      userId: params.userId,
      type: 'order',
      title: 'Update Pesanan',
      body: `${params.mitraName} ${label}.`,
      data: { order_id: params.orderId, status: params.newStatus },
    });
  }

  // ── Helper: notifikasi pesan chat baru ────────────────────────────────────

  async notifyNewChat(params: {
    recipientId: number;
    senderName: string;
    message: string;
    conversationId: number;
  }) {
    const preview = params.message.length > 60
      ? `${params.message.substring(0, 60)}...`
      : params.message;

    return this.create({
      userId: params.recipientId,
      type: 'chat',
      title: `Pesan dari ${params.senderName}`,
      body: preview,
      data: { conversation_id: params.conversationId },
    });
  }

  // ── Helper: notifikasi saldo masuk ke mitra ───────────────────────────────

  async notifyBalanceCredited(params: {
    mitraId: number;
    amount: number;
    orderId: number;
  }) {
    const formatted = new Intl.NumberFormat('id-ID').format(params.amount);
    return this.create({
      userId: params.mitraId,
      type: 'balance',
      title: 'Saldo Masuk 💰',
      body: `Rp ${formatted} dari pesanan #${params.orderId} telah masuk ke BantuinPay kamu.`,
      data: { order_id: params.orderId, amount: params.amount },
    });
  }
}
