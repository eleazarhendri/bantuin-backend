import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatConversation, ChatMessage } from '@prisma/client';

type ConvWithUsers = ChatConversation & {
  user: { id: number; name: string | null; photoUrl: string | null };
  mitra: { id: number; name: string | null; photoUrl: string | null };
  messages: ChatMessage[];
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Format conversation untuk response ────────────────────────────────────

  private formatConversation(conv: ConvWithUsers, requesterId: number) {
    const isUser = conv.userId === requesterId;
    const partner = isUser ? conv.mitra : conv.user;
    const unread = isUser ? conv.unreadByUser : conv.unreadByMitra;

    return {
      id: conv.id.toString(),
      order_id: conv.orderId?.toString() ?? conv.id.toString(),
      partner_name: partner.name ?? '',
      partner_avatar_url: partner.photoUrl ?? null,
      mitra_id: conv.mitraId.toString(),
      last_message: conv.lastMessage,
      last_message_at: conv.lastMessageAt,
      unread_count: unread,
      order_status: 'active',
      category_name: conv.categoryName,
    };
  }

  private formatMessage(msg: ChatMessage) {
    return {
      id: msg.id.toString(),
      order_id: msg.conversationId.toString(),
      sender_id: msg.senderId.toString(),
      sender_name: '',
      type: msg.type,
      content: msg.content,
      image_url: msg.imageUrl ?? null,
      is_read: msg.isRead,
      created_at: msg.createdAt,
    };
  }

  // ── Get atau buat conversation ─────────────────────────────────────────────

  async getOrCreateConversation(params: {
    userId: number;
    mitraId: number;
    orderId?: number;
    categoryName?: string;
  }): Promise<ConvWithUsers> {
    // Cari conversation yang sudah ada
    const existing = await this.prisma.chatConversation.findFirst({
      where: {
        userId: params.userId,
        mitraId: params.mitraId,
        ...(params.orderId ? { orderId: params.orderId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, photoUrl: true } },
        mitra: { select: { id: true, name: true, photoUrl: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (existing) return existing as ConvWithUsers;

    // Buat baru
    const created = await this.prisma.chatConversation.create({
      data: {
        userId: params.userId,
        mitraId: params.mitraId,
        orderId: params.orderId ?? null,
        categoryName: params.categoryName ?? '',
      },
      include: {
        user: { select: { id: true, name: true, photoUrl: true } },
        mitra: { select: { id: true, name: true, photoUrl: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    this.logger.log(
      `[CHAT] Conversation baru: id=${created.id} user=${params.userId} mitra=${params.mitraId}`,
    );

    return created as ConvWithUsers;
  }

  // ── Get semua conversations user ───────────────────────────────────────────

  async getConversations(userId: number) {
    const convs = await this.prisma.chatConversation.findMany({
      where: {
        OR: [{ userId }, { mitraId: userId }],
      },
      include: {
        user: { select: { id: true, name: true, photoUrl: true } },
        mitra: { select: { id: true, name: true, photoUrl: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return convs.map((c) => this.formatConversation(c as ConvWithUsers, userId));
  }

  // ── Get messages dalam conversation ───────────────────────────────────────

  async getMessages(conversationId: number, requesterId: number) {
    const conv = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conv) throw new NotFoundException('Conversation tidak ditemukan');
    if (conv.userId !== requesterId && conv.mitraId !== requesterId) {
      throw new ForbiddenException('Kamu tidak punya akses ke conversation ini');
    }

    // Tandai pesan sebagai dibaca
    await this.prisma.chatMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: requesterId },
        isRead: false,
      },
      data: { isRead: true },
    });

    // Reset unread counter
    const isUser = conv.userId === requesterId;
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: isUser ? { unreadByUser: 0 } : { unreadByMitra: 0 },
    });

    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => ({
      id: m.id.toString(),
      order_id: conversationId.toString(),
      sender_id: m.senderId.toString(),
      sender_name: m.sender.name ?? '',
      type: m.type,
      content: m.content,
      image_url: m.imageUrl ?? null,
      is_read: m.isRead,
      created_at: m.createdAt,
    }));
  }

  // ── Kirim pesan ────────────────────────────────────────────────────────────

  async sendMessage(params: {
    conversationId: number;
    senderId: number;
    content: string;
    type?: string;
    imageUrl?: string;
  }) {
    const conv = await this.prisma.chatConversation.findUnique({
      where: { id: params.conversationId },
      include: {
        user: { select: { id: true, name: true } },
        mitra: { select: { id: true, name: true } },
      },
    });

    if (!conv) throw new NotFoundException('Conversation tidak ditemukan');
    if (conv.userId !== params.senderId && conv.mitraId !== params.senderId) {
      throw new ForbiddenException('Kamu tidak bisa mengirim pesan di sini');
    }

    const isUser = conv.userId === params.senderId;
    const recipientId = isUser ? conv.mitraId : conv.userId;
    const senderName = isUser
      ? (conv.user.name ?? 'User')
      : (conv.mitra.name ?? 'Mitra');

    // Buat pesan
    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId: params.conversationId,
        senderId: params.senderId,
        content: params.content,
        type: params.type ?? 'text',
        imageUrl: params.imageUrl ?? null,
      },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    // Update conversation: lastMessage + unread counter
    await this.prisma.chatConversation.update({
      where: { id: params.conversationId },
      data: {
        lastMessage: params.type === 'image' ? '📷 Foto' : params.content,
        lastMessageAt: new Date(),
        ...(isUser
          ? { unreadByMitra: { increment: 1 } }
          : { unreadByUser: { increment: 1 } }),
      },
    });

    // Kirim notifikasi ke penerima
    await this.notificationsService.notifyNewChat({
      recipientId,
      senderName,
      message: params.content,
      conversationId: params.conversationId,
    });

    this.logger.log(
      `[CHAT] Pesan baru: convId=${params.conversationId} sender=${params.senderId}`,
    );

    return {
      id: message.id.toString(),
      order_id: params.conversationId.toString(),
      sender_id: message.senderId.toString(),
      sender_name: message.sender.name ?? '',
      type: message.type,
      content: message.content,
      image_url: message.imageUrl ?? null,
      is_read: message.isRead,
      created_at: message.createdAt,
    };
  }
}
