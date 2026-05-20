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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }
    async findByGoogleId(googleId) {
        return this.prisma.user.findUnique({
            where: { googleId },
        });
    }
    async findById(id) {
        return this.prisma.user.findUnique({
            where: { id: id },
        });
    }
    async createWithEmail(data) {
        return this.prisma.user.create({
            data: {
                email: data.email,
                password: data.hashedPassword,
                name: data.name,
            },
        });
    }
    async createWithGoogle(data) {
        return this.prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                googleId: data.googleId,
                photoUrl: data.photoUrl ?? null,
            },
        });
    }
    async linkGoogleId(userId, googleId, googleName, googlePhotoUrl) {
        const user = await this.findById(userId);
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                googleId,
                name: user?.name ?? googleName ?? null,
                photoUrl: user?.photoUrl ?? googlePhotoUrl ?? null,
            },
        });
    }
    async updateProfile(userId, data) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
            },
        });
    }
    async setMitraStatus(userId, isMitra) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                isMitra,
                role: isMitra ? 'MITRA' : 'USER',
            },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map