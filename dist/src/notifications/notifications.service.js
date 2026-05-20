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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async create(params) {
        const notif = await this.prisma.notification.create({
            data: {
                userId: params.userId,
                type: params.type,
                title: params.title,
                body: params.body,
                data: params.data ? JSON.stringify(params.data) : null,
            },
        });
        this.logger.log(`[NOTIF] Created: userId=${params.userId} type=${params.type} title="${params.title}"`);
        return notif;
    }
    async getByUser(userId, limit = 30) {
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
    async markRead(notifId, userId) {
        return this.prisma.notification.updateMany({
            where: { id: notifId, userId },
            data: { isRead: true },
        });
    }
    async markAllRead(userId) {
        return this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
    async countUnread(userId) {
        return this.prisma.notification.count({
            where: { userId, isRead: false },
        });
    }
    async notifyNewOrder(params) {
        return this.create({
            userId: params.mitraId,
            type: 'order',
            title: 'Pesanan Baru Masuk! 🛎️',
            body: `${params.userName} memesan layanan ${params.categoryName}. Segera konfirmasi!`,
            data: { order_id: params.orderId },
        });
    }
    async notifyOrderStatusUpdate(params) {
        const statusLabel = {
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
    async notifyNewChat(params) {
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
    async notifyBalanceCredited(params) {
        const formatted = new Intl.NumberFormat('id-ID').format(params.amount);
        return this.create({
            userId: params.mitraId,
            type: 'balance',
            title: 'Saldo Masuk 💰',
            body: `Rp ${formatted} dari pesanan #${params.orderId} telah masuk ke BantuinPay kamu.`,
            data: { order_id: params.orderId, amount: params.amount },
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map