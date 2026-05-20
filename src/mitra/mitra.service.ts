import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterMitraDto } from './dto/register-mitra.dto';
import { MitraRegistration, MitraProfile, User } from '@prisma/client';

// Status pendaftaran mitra — harus konsisten dengan schema.prisma
export const RegistrationStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

// Tipe response mitra untuk search/list
export type MitraWithUser = MitraProfile & { user: User };

@Injectable()
export class MitraService {
  private readonly logger = new Logger(MitraService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Submit Pendaftaran ─────────────────────────────────────────────────────

  async submitRegistration(
    userId: number,
    dto: RegisterMitraDto,
  ): Promise<MitraRegistration> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new NotFoundException('User tidak ditemukan');
    if (user.isMitra) throw new ConflictException('Kamu sudah terdaftar sebagai mitra');

    const existingPending = await this.prisma.mitraRegistration.findFirst({
      where: { userId, status: RegistrationStatus.PENDING },
    });

    if (existingPending) {
      throw new ConflictException(
        'Kamu sudah memiliki pendaftaran yang sedang menunggu review admin. ' +
          'Harap tunggu hingga pendaftaran sebelumnya diproses.',
      );
    }

    const registration = await this.prisma.mitraRegistration.create({
      data: {
        userId,
        nik: dto.nik,
        ktpUrl: dto.ktpUrl,
        selfieUrl: dto.selfieUrl,
        serviceCategory: dto.serviceCategory,
        experience: dto.experience,
        status: RegistrationStatus.PENDING,
      },
    });

    this.logger.log(
      `[MITRA] Pendaftaran baru: userId=${userId} | registrationId=${registration.id} | category=${dto.serviceCategory}`,
    );

    return registration;
  }

  // ── Cek Status Pendaftaran ─────────────────────────────────────────────────

  async getMyRegistrationStatus(
    userId: number,
  ): Promise<MitraRegistration | null> {
    return this.prisma.mitraRegistration.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Search / List Mitra Aktif ──────────────────────────────────────────────

  /**
   * Cari mitra yang sudah aktif (isMitra = true) dengan filter opsional.
   *
   * @param categoryId  - filter berdasarkan kategori (opsional)
   * @param query       - pencarian nama/deskripsi (opsional)
   * @param minRating   - filter rating minimum (opsional)
   * @param limit       - jumlah hasil (default 20)
   * @param offset      - pagination offset (default 0)
   */
  async searchMitras(params: {
    categoryId?: string;
    query?: string;
    minRating?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ data: object[]; total: number }> {
    const { categoryId, query, minRating, limit = 20, offset = 0 } = params;

    // Build where clause untuk MitraProfile
    const profileWhere: Record<string, unknown> = {};

    // Filter kategori
    if (categoryId) {
      profileWhere.category = { contains: categoryId };
    }

    // Filter rating minimum
    if (minRating !== undefined && minRating > 0) {
      profileWhere.rating = { gte: minRating };
    }

    // SQLite tidak support mode: 'insensitive' — pakai contains biasa
    const userWhere: Record<string, unknown> = { isMitra: true };

    // Jika ada query teks, cari di description/bio/campus/domicile
    const queryFilter =
      query && query.trim()
        ? {
            OR: [
              { description: { contains: query } },
              { bio: { contains: query } },
              { campus: { contains: query } },
              { domicile: { contains: query } },
            ],
          }
        : {};

    const whereClause = {
      ...profileWhere,
      ...queryFilter,
      user: userWhere,
    };

    const [profiles, total] = await Promise.all([
      this.prisma.mitraProfile.findMany({
        where: whereClause,
        include: { user: true },
        orderBy: [
          { isOnline: 'desc' },
          { rating: 'desc' },
          { totalOrders: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      this.prisma.mitraProfile.count({ where: whereClause }),
    ]);

    return {
      data: profiles.map((p) => this.formatMitraProfile(p as MitraWithUser)),
      total,
    };
  }

  // ── Get Mitra by ID ────────────────────────────────────────────────────────

  async getMitraById(mitraUserId: number): Promise<object> {
    const profile = await this.prisma.mitraProfile.findUnique({
      where: { userId: mitraUserId },
      include: { user: true },
    });

    if (!profile) throw new NotFoundException('Profil mitra tidak ditemukan');

    return this.formatMitraProfile(profile as MitraWithUser);
  }

  // ── Update Status Online ───────────────────────────────────────────────────

  async setOnlineStatus(userId: number, isOnline: boolean): Promise<object> {
    const profile = await this.prisma.mitraProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new NotFoundException('Profil mitra tidak ditemukan');

    const updated = await this.prisma.mitraProfile.update({
      where: { userId },
      data: { isOnline },
      include: { user: true },
    });

    return this.formatMitraProfile(updated as MitraWithUser);
  }

  // ── Update Profil Mitra ────────────────────────────────────────────────────

  async updateMitraProfile(
    userId: number,
    data: {
      description?: string;
      bio?: string;
      price?: number;
      campus?: string;
      domicile?: string;
      phoneNumber?: string;
    },
  ): Promise<object> {
    const profile = await this.prisma.mitraProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new NotFoundException('Profil mitra tidak ditemukan');

    const updated = await this.prisma.mitraProfile.update({
      where: { userId },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.campus !== undefined && { campus: data.campus }),
        ...(data.domicile !== undefined && { domicile: data.domicile }),
        ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
      },
      include: { user: true },
    });

    return this.formatMitraProfile(updated as MitraWithUser);
  }

  // ── Helper: Format MitraProfile untuk response ────────────────────────────

  formatMitraProfile(profile: MitraWithUser): object {
    const categoryIds = profile.category
      ? profile.category.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

    return {
      id: profile.userId.toString(),
      user_id: profile.userId.toString(),
      name: profile.user.name ?? '',
      avatar_url: profile.user.photoUrl ?? null,
      campus: profile.campus,
      domicile: profile.domicile,
      bio: profile.bio,
      category_ids: categoryIds,
      service_description: profile.description,
      starting_price: profile.price,
      rating: profile.rating,
      total_reviews: profile.totalReviews,
      total_transactions: profile.totalOrders,
      is_verified: profile.isVerified,
      is_online: profile.isOnline,
      phone_number: profile.phoneNumber,
      joined_at: profile.createdAt.toISOString(),
      // latitude & longitude tidak disimpan di DB untuk privasi
      // bisa ditambahkan nanti jika dibutuhkan
      latitude: null,
      longitude: null,
      distance_km: null,
      portfolio_urls: [],
    };
  }
}
