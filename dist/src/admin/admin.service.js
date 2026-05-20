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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const mitra_service_1 = require("../mitra/mitra.service");
let AdminService = AdminService_1 = class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AdminService_1.name);
    }
    async getAllRegistrations(status = mitra_service_1.RegistrationStatus.PENDING) {
        return this.prisma.mitraRegistration.findMany({
            where: { status },
            include: {
                user: true,
            },
            orderBy: { createdAt: 'asc' },
        });
    }
    async getRegistrationById(id) {
        const registration = await this.prisma.mitraRegistration.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!registration) {
            throw new common_1.NotFoundException(`Pendaftaran dengan ID ${id} tidak ditemukan`);
        }
        return registration;
    }
    async approveRegistration(registrationId, adminId) {
        const registration = await this.prisma.mitraRegistration.findUnique({
            where: { id: registrationId },
        });
        if (!registration) {
            throw new common_1.NotFoundException(`Pendaftaran dengan ID ${registrationId} tidak ditemukan`);
        }
        if (registration.status !== mitra_service_1.RegistrationStatus.PENDING) {
            throw new common_1.BadRequestException(`Pendaftaran ini sudah diproses dengan status: ${registration.status}`);
        }
        const [updatedRegistration, updatedUser] = await this.prisma.$transaction([
            this.prisma.mitraRegistration.update({
                where: { id: registrationId },
                data: {
                    status: mitra_service_1.RegistrationStatus.APPROVED,
                    reviewedBy: adminId,
                },
            }),
            this.prisma.user.update({
                where: { id: registration.userId },
                data: {
                    isMitra: true,
                    role: 'MITRA',
                },
            }),
        ]);
        await this.prisma.mitraProfile.upsert({
            where: { userId: registration.userId },
            create: {
                userId: registration.userId,
                category: registration.serviceCategory,
                description: registration.experience,
                bio: registration.experience.substring(0, 200),
                price: 0,
                campus: '',
                domicile: '',
                phoneNumber: '',
                isVerified: true,
            },
            update: {
                category: registration.serviceCategory,
                isVerified: true,
            },
        });
        this.logger.log(`[ADMIN] APPROVE: registrationId=${registrationId} | userId=${registration.userId} | adminId=${adminId} | MitraProfile created`);
        return {
            registration: updatedRegistration,
            user: updatedUser,
        };
    }
    async rejectRegistration(registrationId, adminId, adminNote) {
        const registration = await this.prisma.mitraRegistration.findUnique({
            where: { id: registrationId },
        });
        if (!registration) {
            throw new common_1.NotFoundException(`Pendaftaran dengan ID ${registrationId} tidak ditemukan`);
        }
        if (registration.status !== mitra_service_1.RegistrationStatus.PENDING) {
            throw new common_1.BadRequestException(`Pendaftaran ini sudah diproses dengan status: ${registration.status}`);
        }
        const updated = await this.prisma.mitraRegistration.update({
            where: { id: registrationId },
            data: {
                status: mitra_service_1.RegistrationStatus.REJECTED,
                reviewedBy: adminId,
                adminNote: adminNote ?? null,
            },
        });
        this.logger.log(`[ADMIN] REJECT: registrationId=${registrationId} | userId=${registration.userId} | adminId=${adminId} | note="${adminNote}"`);
        return updated;
    }
    async getRegistrationStats() {
        const [pending, approved, rejected] = await Promise.all([
            this.prisma.mitraRegistration.count({ where: { status: mitra_service_1.RegistrationStatus.PENDING } }),
            this.prisma.mitraRegistration.count({ where: { status: mitra_service_1.RegistrationStatus.APPROVED } }),
            this.prisma.mitraRegistration.count({ where: { status: mitra_service_1.RegistrationStatus.REJECTED } }),
        ]);
        return { pending, approved, rejected, total: pending + approved + rejected };
    }
    async getAllUsers(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where: { role: { not: 'ADMIN' } },
                select: {
                    id: true, email: true, name: true, photoUrl: true,
                    role: true, isMitra: true, createdAt: true,
                    _count: { select: { ordersAsUser: true, ordersAsMitra: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            this.prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
        ]);
        return {
            data: users.map((u) => ({
                id: u.id,
                email: u.email,
                name: u.name ?? '',
                photo_url: u.photoUrl ?? null,
                role: u.role,
                is_mitra: u.isMitra,
                created_at: u.createdAt,
                total_orders_as_user: u._count.ordersAsUser,
                total_orders_as_mitra: u._count.ordersAsMitra,
            })),
            total,
            page,
            limit,
        };
    }
    async getAllActiveMitras() {
        const mitras = await this.prisma.mitraProfile.findMany({
            include: {
                user: { select: { id: true, name: true, email: true, photoUrl: true, createdAt: true } },
            },
            orderBy: { totalOrders: 'desc' },
        });
        return mitras.map((m) => ({
            id: m.userId,
            name: m.user.name ?? '',
            email: m.user.email,
            photo_url: m.user.photoUrl ?? null,
            category: m.category,
            rating: m.rating,
            total_reviews: m.totalReviews,
            total_orders: m.totalOrders,
            is_online: m.isOnline,
            is_verified: m.isVerified,
            campus: m.campus,
            domicile: m.domicile,
            joined_at: m.user.createdAt,
        }));
    }
    async getAllOrders(page = 1, limit = 20, status) {
        const skip = (page - 1) * limit;
        const where = status ? { status } : {};
        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    mitra: { select: { id: true, name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            this.prisma.order.count({ where }),
        ]);
        return {
            data: orders.map((o) => ({
                id: o.id,
                user_name: o.user.name ?? '',
                user_email: o.user.email,
                mitra_name: o.mitra.name ?? '',
                mitra_email: o.mitra.email,
                category_name: o.categoryName,
                status: o.status,
                total_amount: o.totalAmount,
                created_at: o.createdAt,
                completed_at: o.completedAt ?? null,
            })),
            total,
            page,
            limit,
        };
    }
    async getDashboardOverview() {
        const [totalUsers, totalMitras, totalOrders, pendingOrders, doneOrders, totalRevenue, recentOrders,] = await Promise.all([
            this.prisma.user.count({ where: { role: 'USER' } }),
            this.prisma.user.count({ where: { isMitra: true } }),
            this.prisma.order.count(),
            this.prisma.order.count({ where: { status: 'pending' } }),
            this.prisma.order.count({ where: { status: 'done' } }),
            this.prisma.order.aggregate({
                where: { status: 'done' },
                _sum: { platformFee: true },
            }),
            this.prisma.order.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { name: true } },
                    mitra: { select: { name: true } },
                },
            }),
        ]);
        return {
            total_users: totalUsers,
            total_mitras: totalMitras,
            total_orders: totalOrders,
            pending_orders: pendingOrders,
            done_orders: doneOrders,
            total_platform_revenue: totalRevenue._sum.platformFee ?? 0,
            recent_orders: recentOrders.map((o) => ({
                id: o.id,
                user_name: o.user.name ?? '',
                mitra_name: o.mitra.name ?? '',
                category: o.categoryName,
                status: o.status,
                amount: o.totalAmount,
                created_at: o.createdAt,
            })),
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map