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
var ReviewsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReviewsService = ReviewsService_1 = class ReviewsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ReviewsService_1.name);
    }
    async submitReview(userId, orderId, rating, comment) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order)
            throw new common_1.NotFoundException('Pesanan tidak ditemukan');
        if (order.userId !== userId) {
            throw new common_1.ForbiddenException('Kamu bukan pemilik pesanan ini');
        }
        if (order.status !== 'done') {
            throw new common_1.ForbiddenException('Pesanan harus selesai sebelum memberi ulasan');
        }
        if (order.isReviewed) {
            throw new common_1.ConflictException('Pesanan ini sudah diberi ulasan');
        }
        const [review] = await this.prisma.$transaction(async (tx) => {
            const newReview = await tx.review.create({
                data: {
                    orderId,
                    userId,
                    mitraId: order.mitraId,
                    rating,
                    comment,
                },
                include: {
                    user: { select: { id: true, name: true, photoUrl: true } },
                },
            });
            await tx.order.update({
                where: { id: orderId },
                data: { isReviewed: true },
            });
            const allReviews = await tx.review.findMany({
                where: { mitraId: order.mitraId },
                select: { rating: true },
            });
            const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = allReviews.length > 0
                ? Math.round((totalRating / allReviews.length) * 10) / 10
                : 0;
            await tx.mitraProfile.update({
                where: { userId: order.mitraId },
                data: {
                    rating: avgRating,
                    totalReviews: allReviews.length,
                    totalOrders: { increment: 0 },
                },
            });
            return [newReview];
        });
        this.logger.log(`[REVIEW] Baru: orderId=${orderId} userId=${userId} mitraId=${order.mitraId} rating=${rating}`);
        return {
            id: review.id.toString(),
            order_id: review.orderId.toString(),
            user_id: review.userId.toString(),
            user_name: review.user.name ?? '',
            user_avatar_url: review.user.photoUrl ?? null,
            mitra_id: review.mitraId.toString(),
            rating: review.rating,
            comment: review.comment,
            created_at: review.createdAt,
        };
    }
    async getReviewsByMitra(mitraId) {
        const reviews = await this.prisma.review.findMany({
            where: { mitraId },
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return reviews.map((r) => ({
            id: r.id.toString(),
            order_id: r.orderId.toString(),
            user_id: r.userId.toString(),
            user_name: r.user.name ?? '',
            user_avatar_url: r.user.photoUrl ?? null,
            mitra_id: r.mitraId.toString(),
            rating: r.rating,
            comment: r.comment,
            created_at: r.createdAt,
        }));
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = ReviewsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map