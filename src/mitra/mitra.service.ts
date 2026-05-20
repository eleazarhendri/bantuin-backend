import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterMitraDto } from './dto/register-mitra.dto';
import { CreateMitraServiceDto } from './dto/create-mitra-service.dto';
import { UpdateMitraServiceDto } from './dto/update-mitra-service.dto';
import { MitraRegistration, MitraProfile, MitraService as PrismaMitraService, User } from '@prisma/client';

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
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
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
        include: {
          user: {
            include: {
              mitraServices: {
                where: { isActive: true },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
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
      include: {
        user: {
          include: {
            mitraServices: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
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

  // ── Update Lokasi Mitra ────────────────────────────────────────────────────

  async updateMitraLocation(
    userId: number,
    latitude: number,
    longitude: number,
  ): Promise<object> {
    const profile = await this.prisma.mitraProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new NotFoundException('Profil mitra tidak ditemukan');

    const updated = await this.prisma.mitraProfile.update({
      where: { userId },
      data: { latitude, longitude },
      include: { user: true },
    });

    this.logger.log(
      `[MITRA] Lokasi diperbarui: userId=${userId} lat=${latitude} lng=${longitude}`,
    );

    return this.formatMitraProfile(updated as MitraWithUser);
  }

  // ── Helper: Format MitraProfile untuk response ────────────────────────────

  formatMitraProfile(profile: MitraWithUser): object {
    const categoryIds = profile.category
      ? profile.category.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

    // Services dari relasi user.mitraServices (jika di-include)
    const services = ((profile.user as any).mitraServices ?? []) as PrismaMitraService[];

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
      latitude: profile.latitude ?? null,
      longitude: profile.longitude ?? null,
      distance_km: null,
      portfolio_urls: [],
      // Array jasa mitra — kosong jika tidak di-include
      services: services.map((s) => this.formatService(s)),
    };
  }

  formatService(s: PrismaMitraService): object {
    return {
      id: s.id,
      category_id: s.categoryId,
      title: s.title,
      description: s.description,
      price: s.price,
      price_unit: s.priceUnit,
      is_active: s.isActive,
      created_at: s.createdAt.toISOString(),
    };
  }

  // ── MitraService CRUD ─────────────────────────────────────────────────────

  async getMyServices(userId: number): Promise<PrismaMitraService[]> {
    return this.prisma.mitraService.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createService(userId: number, dto: CreateMitraServiceDto): Promise<PrismaMitraService> {
    // Pastikan user adalah mitra aktif
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isMitra) throw new ForbiddenException('Hanya mitra aktif yang bisa menambah jasa');

    const service = await this.prisma.mitraService.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        priceUnit: dto.priceUnit ?? 'jam',
        isActive: dto.isActive ?? true,
      },
    });

    // Update category di MitraProfile agar include kategori baru
    await this._syncProfileCategory(userId);

    this.logger.log(`[MITRA] Jasa baru: userId=${userId} title="${dto.title}" category=${dto.categoryId}`);
    return service;
  }

  async updateService(
    serviceId: number,
    userId: number,
    dto: UpdateMitraServiceDto,
  ): Promise<PrismaMitraService> {
    const service = await this.prisma.mitraService.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Jasa tidak ditemukan');
    if (service.userId !== userId) throw new ForbiddenException('Bukan jasamu');

    const updated = await this.prisma.mitraService.update({
      where: { id: serviceId },
      data: {
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.priceUnit !== undefined && { priceUnit: dto.priceUnit }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    if (dto.categoryId !== undefined) {
      await this._syncProfileCategory(userId);
    }

    return updated;
  }

  async deleteService(serviceId: number, userId: number): Promise<void> {
    const service = await this.prisma.mitraService.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Jasa tidak ditemukan');
    if (service.userId !== userId) throw new ForbiddenException('Bukan jasamu');

    await this.prisma.mitraService.delete({ where: { id: serviceId } });
    await this._syncProfileCategory(userId);
  }

  /** Sinkronisasi field category di MitraProfile dari daftar jasa aktif */
  private async _syncProfileCategory(userId: number): Promise<void> {
    const services = await this.prisma.mitraService.findMany({
      where: { userId },
      select: { categoryId: true },
    });
    const uniqueCategories = [...new Set(services.map((s) => s.categoryId))];
    await this.prisma.mitraProfile.updateMany({
      where: { userId },
      data: { category: uniqueCategories.join(',') },
    });
  }
}
