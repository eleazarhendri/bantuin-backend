import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Submit ulasan ──────────────────────────────────────────────────────────

  async submitReview(
    userId: number,
    orderId: number,
    rating: number,
    comment: string,
  ) {
    // Validasi order ada dan milik user ini
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');
    if (order.userId !== userId) {
      throw new ForbiddenException('Kamu bukan pemilik pesanan ini');
    }
    if (order.status !== 'done') {
      throw new ForbiddenException('Pesanan harus selesai sebelum memberi ulasan');
    }
    if (order.isReviewed) {
      throw new ConflictException('Pesanan ini sudah diberi ulasan');
    }

    // Buat review dan update order + rating mitra dalam satu transaksi
    const [review] = await this.prisma.$transaction(async (tx) => {
      // 1. Buat review
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

      // 2. Tandai order sudah direview
      await tx.order.update({
        where: { id: orderId },
        data: { isReviewed: true },
      });

      // 3. Hitung ulang rata-rata rating mitra
      const allReviews = await tx.review.findMany({
        where: { mitraId: order.mitraId },
        select: { rating: true },
      });

      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = allReviews.length > 0
        ? Math.round((totalRating / allReviews.length) * 10) / 10
        : 0;

      // 4. Update MitraProfile: rating + totalReviews + totalOrders
      await tx.mitraProfile.update({
        where: { userId: order.mitraId },
        data: {
          rating: avgRating,
          totalReviews: allReviews.length,
          totalOrders: { increment: 0 }, // sudah di-increment saat done
        },
      });

      return [newReview];
    });

    this.logger.log(
      `[REVIEW] Baru: orderId=${orderId} userId=${userId} mitraId=${order.mitraId} rating=${rating}`,
    );

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

  // ── Ambil ulasan untuk mitra ───────────────────────────────────────────────

  async getReviewsByMitra(mitraId: number) {
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
}
