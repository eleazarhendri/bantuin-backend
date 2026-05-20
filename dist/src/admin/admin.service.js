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
            this.prisma.mitraRegistration.count({
                where: { status: mitra_service_1.RegistrationStatus.PENDING },
            }),
            this.prisma.mitraRegistration.count({
                where: { status: mitra_service_1.RegistrationStatus.APPROVED },
            }),
            this.prisma.mitraRegistration.count({
                where: { status: mitra_service_1.RegistrationStatus.REJECTED },
            }),
        ]);
        return {
            pending,
            approved,
            rejected,
            total: pending + approved + rejected,
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map