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
var MitraService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MitraService = exports.RegistrationStatus = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
exports.RegistrationStatus = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
};
let MitraService = MitraService_1 = class MitraService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(MitraService_1.name);
    }
    async submitRegistration(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User tidak ditemukan');
        if (user.isMitra)
            throw new common_1.ConflictException('Kamu sudah terdaftar sebagai mitra');
        const existingPending = await this.prisma.mitraRegistration.findFirst({
            where: { userId, status: exports.RegistrationStatus.PENDING },
        });
        if (existingPending) {
            throw new common_1.ConflictException('Kamu sudah memiliki pendaftaran yang sedang menunggu review admin. ' +
                'Harap tunggu hingga pendaftaran sebelumnya diproses.');
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
                status: exports.RegistrationStatus.PENDING,
            },
        });
        this.logger.log(`[MITRA] Pendaftaran baru: userId=${userId} | registrationId=${registration.id} | category=${dto.serviceCategory}`);
        return registration;
    }
    async getMyRegistrationStatus(userId) {
        return this.prisma.mitraRegistration.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async searchMitras(params) {
        const { categoryId, query, minRating, limit = 20, offset = 0 } = params;
        const profileWhere = {};
        if (categoryId) {
            profileWhere.category = { contains: categoryId };
        }
        if (minRating !== undefined && minRating > 0) {
            profileWhere.rating = { gte: minRating };
        }
        const userWhere = { isMitra: true };
        const queryFilter = query && query.trim()
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
            data: profiles.map((p) => this.formatMitraProfile(p)),
            total,
        };
    }
    async getMitraById(mitraUserId) {
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
        if (!profile)
            throw new common_1.NotFoundException('Profil mitra tidak ditemukan');
        return this.formatMitraProfile(profile);
    }
    async setOnlineStatus(userId, isOnline) {
        const profile = await this.prisma.mitraProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Profil mitra tidak ditemukan');
        const updated = await this.prisma.mitraProfile.update({
            where: { userId },
            data: { isOnline },
            include: { user: true },
        });
        return this.formatMitraProfile(updated);
    }
    async updateMitraProfile(userId, data) {
        const profile = await this.prisma.mitraProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Profil mitra tidak ditemukan');
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
        return this.formatMitraProfile(updated);
    }
    async updateMitraLocation(userId, latitude, longitude) {
        const profile = await this.prisma.mitraProfile.findUnique({
            where: { userId },
        });
        if (!profile)
            throw new common_1.NotFoundException('Profil mitra tidak ditemukan');
        const updated = await this.prisma.mitraProfile.update({
            where: { userId },
            data: { latitude, longitude },
            include: { user: true },
        });
        this.logger.log(`[MITRA] Lokasi diperbarui: userId=${userId} lat=${latitude} lng=${longitude}`);
        return this.formatMitraProfile(updated);
    }
    formatMitraProfile(profile) {
        const categoryIds = profile.category
            ? profile.category.split(',').map((c) => c.trim()).filter(Boolean)
            : [];
        const services = (profile.user.mitraServices ?? []);
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
            services: services.map((s) => this.formatService(s)),
        };
    }
    formatService(s) {
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
    async getMyServices(userId) {
        return this.prisma.mitraService.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async createService(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.isMitra)
            throw new common_1.ForbiddenException('Hanya mitra aktif yang bisa menambah jasa');
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
        await this._syncProfileCategory(userId);
        this.logger.log(`[MITRA] Jasa baru: userId=${userId} title="${dto.title}" category=${dto.categoryId}`);
        return service;
    }
    async updateService(serviceId, userId, dto) {
        const service = await this.prisma.mitraService.findUnique({ where: { id: serviceId } });
        if (!service)
            throw new common_1.NotFoundException('Jasa tidak ditemukan');
        if (service.userId !== userId)
            throw new common_1.ForbiddenException('Bukan jasamu');
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
    async deleteService(serviceId, userId) {
        const service = await this.prisma.mitraService.findUnique({ where: { id: serviceId } });
        if (!service)
            throw new common_1.NotFoundException('Jasa tidak ditemukan');
        if (service.userId !== userId)
            throw new common_1.ForbiddenException('Bukan jasamu');
        await this.prisma.mitraService.delete({ where: { id: serviceId } });
        await this._syncProfileCategory(userId);
    }
    async _syncProfileCategory(userId) {
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
};
exports.MitraService = MitraService;
exports.MitraService = MitraService = MitraService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MitraService);
//# sourceMappingURL=mitra.service.js.map