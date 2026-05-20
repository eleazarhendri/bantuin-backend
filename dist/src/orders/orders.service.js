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
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const orders_gateway_1 = require("./orders.gateway");
const notifications_service_1 = require("../notifications/notifications.service");
const PLATFORM_COMMISSION = 0.08;
const MITRA_ALLOWED_STATUSES = [
    'accepted', 'shopping', 'on_the_way', 'diagnosis',
    'in_progress', 'ready_pickup', 'done', 'cancelled',
];
const USER_CANCEL_ALLOWED = ['pending'];
const USER_CANCEL_REQUEST_ALLOWED = [
    'accepted', 'shopping', 'on_the_way', 'diagnosis', 'in_progress', 'ready_pickup',
];
const CANCEL_REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(prisma, gateway, notificationsService) {
        this.prisma = prisma;
        this.gateway = gateway;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async formatOrder(order) {
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
            cancellation_status: order.cancellationStatus ?? null,
            cancellation_reason: order.cancellationReason ?? null,
            cancellation_requested_at: order.cancellationRequestedAt ?? null,
        };
    }
    async createOrder(userId, dto) {
        const mitra = await this.prisma.user.findUnique({
            where: { id: dto.mitraId },
        });
        if (!mitra || !mitra.isMitra) {
            throw new common_1.NotFoundException('Mitra tidak ditemukan atau belum aktif');
        }
        const platformFee = (dto.itemBudget + dto.serviceFee) * PLATFORM_COMMISSION;
        const totalAmount = dto.itemBudget + dto.serviceFee + platformFee;
        if (dto.paymentMethod === 'wallet') {
            const userWallet = await this.prisma.wallet.findUnique({
                where: { userId },
            });
            const currentBalance = userWallet?.balance ?? 0;
            if (currentBalance < totalAmount) {
                throw new common_1.BadRequestException(`Saldo tidak cukup. Saldo kamu: Rp ${Math.floor(currentBalance).toLocaleString('id-ID')}, dibutuhkan: Rp ${Math.floor(totalAmount).toLocaleString('id-ID')}`);
            }
            await this.prisma.$transaction([
                this.prisma.wallet.update({
                    where: { userId },
                    data: { balance: { decrement: totalAmount } },
                }),
                this.prisma.walletTransaction.create({
                    data: {
                        walletId: userWallet.id,
                        amount: totalAmount,
                        type: 'DEBIT',
                        description: `Pembayaran pesanan ke ${mitra.name ?? 'Mitra'} - ${dto.categoryName}`,
                    },
                }),
            ]);
            this.logger.log(`[WALLET] Potong saldo user=${userId} -${totalAmount} untuk pesanan ke mitra=${dto.mitraId}`);
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
        this.logger.log(`[ORDER] Dibuat: id=${order.id} userId=${userId} mitraId=${dto.mitraId} total=${totalAmount}`);
        const formatted = await this.formatOrder(order);
        this.gateway.notifyMitraNewOrder(dto.mitraId, formatted);
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        await this.notificationsService.notifyNewOrder({
            mitraId: dto.mitraId,
            orderId: order.id,
            userName: user?.name ?? 'User',
            categoryName: dto.categoryName,
        });
        return formatted;
    }
    async getOrdersByUser(userId) {
        const orders = await this.prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return Promise.all(orders.map((o) => this.formatOrder(o)));
    }
    async getOrdersByMitra(mitraId) {
        const orders = await this.prisma.order.findMany({
            where: { mitraId },
            orderBy: { createdAt: 'desc' },
        });
        return Promise.all(orders.map((o) => this.formatOrder(o)));
    }
    async getOrderById(orderId, requesterId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order)
            throw new common_1.NotFoundException('Pesanan tidak ditemukan');
        if (order.userId !== requesterId && order.mitraId !== requesterId) {
            throw new common_1.ForbiddenException('Kamu tidak punya akses ke pesanan ini');
        }
        return this.formatOrder(order);
    }
    async updateOrderStatus(orderId, mitraId, dto) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order)
            throw new common_1.NotFoundException('Pesanan tidak ditemukan');
        if (order.mitraId !== mitraId) {
            throw new common_1.ForbiddenException('Kamu bukan mitra untuk pesanan ini');
        }
        if (!MITRA_ALLOWED_STATUSES.includes(dto.status)) {
            throw new common_1.BadRequestException('Status tidak valid');
        }
        const now = new Date();
        const updateData = { status: dto.status };
        if (dto.status === 'accepted')
            updateData.acceptedAt = now;
        if (dto.status === 'done') {
            updateData.completedAt = now;
            await this.creditMitraWallet(mitraId, order.id, order.serviceFee);
        }
        if (dto.status === 'cancelled')
            updateData.cancelledAt = now;
        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data: updateData,
        });
        this.logger.log(`[ORDER] Status update: id=${orderId} ${order.status} → ${dto.status} by mitra=${mitraId}`);
        const formatted = await this.formatOrder(updated);
        if (dto.status === 'cancelled') {
            this.gateway.notifyOrderCancelled(order.userId, mitraId, formatted);
        }
        else {
            this.gateway.notifyOrderStatusUpdated(order.userId, mitraId, formatted);
        }
        const mitraUser = await this.prisma.user.findUnique({ where: { id: mitraId } });
        await this.notificationsService.notifyOrderStatusUpdate({
            userId: order.userId,
            orderId: orderId,
            mitraName: mitraUser?.name ?? 'Mitra',
            newStatus: dto.status,
        });
        if (dto.status === 'done') {
            await this.notificationsService.notifyBalanceCredited({
                mitraId,
                amount: order.serviceFee * (1 - PLATFORM_COMMISSION),
                orderId,
            });
        }
        return formatted;
    }
    async cancelOrder(orderId, userId) {
        return this.cancelOrderWithRefund(orderId, userId);
    }
    async requestCancellation(orderId, userId, reason) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Pesanan tidak ditemukan');
        if (order.userId !== userId)
            throw new common_1.ForbiddenException('Bukan pesananmu');
        if (!USER_CANCEL_REQUEST_ALLOWED.includes(order.status)) {
            throw new common_1.BadRequestException('Pembatalan hanya bisa diajukan saat pesanan sedang diproses mitra.');
        }
        const cancellationStatus = order.cancellationStatus;
        if (cancellationStatus === 'requested') {
            throw new common_1.BadRequestException('Permintaan pembatalan sudah diajukan. Tunggu respons mitra.');
        }
        const now = new Date();
        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                cancellationStatus: 'requested',
                cancellationReason: reason ?? null,
                cancellationRequestedAt: now,
            },
        });
        const formatted = await this.formatOrder(updated);
        this.gateway.notifyOrderStatusUpdated(order.userId, order.mitraId, formatted);
        const userRecord = await this.prisma.user.findUnique({ where: { id: userId } });
        await this.notificationsService.notifyOrderStatusUpdate({
            userId: order.mitraId,
            orderId,
            mitraName: userRecord?.name ?? 'User',
            newStatus: 'cancellation_requested',
        });
        this.logger.log(`[ORDER] Cancellation requested: id=${orderId} userId=${userId} reason="${reason}"`);
        return formatted;
    }
    async respondCancellation(orderId, mitraId, approve) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Pesanan tidak ditemukan');
        if (order.mitraId !== mitraId)
            throw new common_1.ForbiddenException('Bukan pesananmu');
        const cancellationStatus = order.cancellationStatus;
        const cancellationRequestedAt = order.cancellationRequestedAt;
        if (cancellationStatus !== 'requested') {
            throw new common_1.BadRequestException('Tidak ada permintaan pembatalan aktif untuk pesanan ini.');
        }
        if (cancellationRequestedAt) {
            const elapsed = Date.now() - cancellationRequestedAt.getTime();
            if (elapsed > CANCEL_REQUEST_TIMEOUT_MS) {
                await this.prisma.order.update({
                    where: { id: orderId },
                    data: { cancellationStatus: 'expired' },
                });
                throw new common_1.BadRequestException('Waktu respons pembatalan sudah habis (5 menit). Pesanan tidak dapat dibatalkan.');
            }
        }
        if (approve) {
            const updated = await this.cancelOrderWithRefund(orderId, order.userId, true);
            await this.prisma.order.update({
                where: { id: orderId },
                data: { cancellationStatus: 'approved' },
            });
            this.logger.log(`[ORDER] Cancellation APPROVED by mitra=${mitraId} for order=${orderId}`);
            return updated;
        }
        else {
            const updated = await this.prisma.order.update({
                where: { id: orderId },
                data: { cancellationStatus: 'rejected' },
            });
            const formatted = await this.formatOrder(updated);
            this.gateway.notifyOrderStatusUpdated(order.userId, mitraId, formatted);
            this.logger.log(`[ORDER] Cancellation REJECTED by mitra=${mitraId} for order=${orderId}`);
            return formatted;
        }
    }
    async creditMitraWallet(mitraId, orderId, serviceFee) {
        const wallet = await this.prisma.wallet.upsert({
            where: { userId: mitraId },
            create: { userId: mitraId, balance: 0 },
            update: {},
        });
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
        this.logger.log(`[WALLET] Kredit mitra=${mitraId} +${mitraEarning} dari order=${orderId}`);
    }
    async getWallet(userId) {
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 100,
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
    async getUserWallet(userId) {
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId },
        });
        return {
            balance: wallet?.balance ?? 0,
        };
    }
    async withdrawWallet(userId, amount) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('Jumlah penarikan harus lebih dari 0');
        }
        const wallet = await this.prisma.wallet.findUnique({
            where: { userId },
        });
        if (!wallet) {
            throw new common_1.BadRequestException('Wallet tidak ditemukan');
        }
        if (wallet.balance < amount) {
            throw new common_1.BadRequestException(`Saldo tidak cukup. Saldo tersedia: Rp ${Math.floor(wallet.balance).toLocaleString('id-ID')}`);
        }
        const MIN_WITHDRAW = 10_000;
        if (amount < MIN_WITHDRAW) {
            throw new common_1.BadRequestException(`Minimum penarikan adalah Rp ${MIN_WITHDRAW.toLocaleString('id-ID')}`);
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
        this.logger.log(`[WALLET] Withdraw userId=${userId} -${amount} | sisa=${updatedWallet.balance}`);
        return {
            success: true,
            withdrawn: amount,
            new_balance: updatedWallet.balance,
            transaction_id: tx.id,
        };
    }
    async cancelOrderWithRefund(orderId, userId, skipStatusCheck = false) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order)
            throw new common_1.NotFoundException('Pesanan tidak ditemukan');
        if (order.userId !== userId) {
            throw new common_1.ForbiddenException('Kamu bukan pemilik pesanan ini');
        }
        if (!skipStatusCheck && !USER_CANCEL_ALLOWED.includes(order.status)) {
            throw new common_1.BadRequestException('Pesanan hanya bisa dibatalkan saat masih pending');
        }
        const userWallet = await this.prisma.wallet.findUnique({
            where: { userId },
        });
        if (userWallet) {
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
                this.logger.log(`[WALLET] Refund user=${userId} +${order.totalAmount} dari pembatalan order=${orderId}`);
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
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        orders_gateway_1.OrdersGateway,
        notifications_service_1.NotificationsService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map