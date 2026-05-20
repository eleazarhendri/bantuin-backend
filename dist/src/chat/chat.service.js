"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
let ChatService = ChatService_1 = class ChatService {
    constructor(prisma, notificationsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(ChatService_1.name);
    }
    formatConversation(conv, requesterId) {
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
    formatMessage(msg) {
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
    async getOrCreateConversation(params) {
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
        if (existing)
            return existing;
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
        this.logger.log(`[CHAT] Conversation baru: id=${created.id} user=${params.userId} mitra=${params.mitraId}`);
        return created;
    }
    async getConversations(userId) {
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
        return convs.map((c) => this.formatConversation(c, userId));
    }
    async getMessages(conversationId, requesterId) {
        const conv = await this.prisma.chatConversation.findUnique({
            where: { id: conversationId },
        });
        if (!conv)
            throw new common_1.NotFoundException('Conversation tidak ditemukan');
        if (conv.userId !== requesterId && conv.mitraId !== requesterId) {
            throw new common_1.ForbiddenException('Kamu tidak punya akses ke conversation ini');
        }
        await this.prisma.chatMessage.updateMany({
            where: {
                conversationId,
                senderId: { not: requesterId },
                isRead: false,
            },
            data: { isRead: true },
        });
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
    async sendMessage(params) {
        const conv = await this.prisma.chatConversation.findUnique({
            where: { id: params.conversationId },
            include: {
                user: { select: { id: true, name: true } },
                mitra: { select: { id: true, name: true } },
            },
        });
        if (!conv)
            throw new common_1.NotFoundException('Conversation tidak ditemukan');
        if (conv.userId !== params.senderId && conv.mitraId !== params.senderId) {
            throw new common_1.ForbiddenException('Kamu tidak bisa mengirim pesan di sini');
        }
        const isUser = conv.userId === params.senderId;
        const recipientId = isUser ? conv.mitraId : conv.userId;
        const senderName = isUser
            ? (conv.user.name ?? 'User')
            : (conv.mitra.name ?? 'Mitra');
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
        await this.notificationsService.notifyNewChat({
            recipientId,
            senderName,
            message: params.content,
            conversationId: params.conversationId,
        });
        this.logger.log(`[CHAT] Pesan baru: convId=${params.conversationId} sender=${params.senderId}`);
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
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], ChatService);
//# sourceMappingURL=chat.service.js.map