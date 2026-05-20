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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MitraController = void 0;
const common_1 = require("@nestjs/common");
const mitra_service_1 = require("./mitra.service");
const register_mitra_dto_1 = require("./dto/register-mitra.dto");
const update_mitra_profile_dto_1 = require("./dto/update-mitra-profile.dto");
const create_mitra_service_dto_1 = require("./dto/create-mitra-service.dto");
const update_mitra_service_dto_1 = require("./dto/update-mitra-service.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const optional_jwt_auth_guard_1 = require("../auth/guards/optional-jwt-auth.guard");
let MitraController = class MitraController {
    constructor(mitraService) {
        this.mitraService = mitraService;
    }
    async register(req, dto) {
        const registration = await this.mitraService.submitRegistration(req.user.id, dto);
        return {
            message: 'Pendaftaran berhasil dikirim. Tim Bantuin akan memverifikasi dalam 1×24 jam.',
            data: registration,
        };
    }
    async getRegistrationStatus(req) {
        const registration = await this.mitraService.getMyRegistrationStatus(req.user.id);
        return { data: registration };
    }
    async searchMitras(category, q, minRating, limit, offset) {
        const result = await this.mitraService.searchMitras({
            categoryId: category,
            query: q,
            minRating: minRating ? parseFloat(minRating) : undefined,
            limit: limit ? parseInt(limit, 10) : 20,
            offset: offset ? parseInt(offset, 10) : 0,
        });
        return result;
    }
    async getMyProfile(req) {
        return this.mitraService.getMitraById(req.user.id);
    }
    async updateMyProfile(req, dto) {
        return this.mitraService.updateMitraProfile(req.user.id, dto);
    }
    async setOnlineStatus(req, isOnline) {
        return this.mitraService.setOnlineStatus(req.user.id, isOnline);
    }
    async updateLocation(req, latitude, longitude) {
        if (latitude == null || longitude == null) {
            throw new common_1.BadRequestException('latitude dan longitude wajib diisi');
        }
        if (latitude < -90 || latitude > 90) {
            throw new common_1.BadRequestException('latitude harus antara -90 dan 90');
        }
        if (longitude < -180 || longitude > 180) {
            throw new common_1.BadRequestException('longitude harus antara -180 dan 180');
        }
        return this.mitraService.updateMitraLocation(req.user.id, latitude, longitude);
    }
    async getMitraById(id) {
        return this.mitraService.getMitraById(id);
    }
    async getMyServices(req) {
        const services = await this.mitraService.getMyServices(req.user.id);
        return { data: services.map((s) => this.mitraService.formatService(s)) };
    }
    async createService(req, dto) {
        const service = await this.mitraService.createService(req.user.id, dto);
        return {
            message: 'Jasa berhasil ditambahkan.',
            data: this.mitraService.formatService(service),
        };
    }
    async updateService(id, req, dto) {
        const service = await this.mitraService.updateService(id, req.user.id, dto);
        return {
            message: 'Jasa berhasil diperbarui.',
            data: this.mitraService.formatService(service),
        };
    }
    async deleteService(id, req) {
        await this.mitraService.deleteService(id, req.user.id);
        return { message: 'Jasa berhasil dihapus.' };
    }
};
exports.MitraController = MitraController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, register_mitra_dto_1.RegisterMitraDto]),
    __metadata("design:returntype", Promise)
], MitraController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('registration-status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MitraController.prototype, "getRegistrationStatus", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('q')),
    __param(2, (0, common_1.Query)('minRating')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], MitraController.prototype, "searchMitras", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MitraController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_mitra_profile_dto_1.UpdateMitraProfileDto]),
    __metadata("design:returntype", Promise)
], MitraController.prototype, "updateMyProfile", null);
__decorate([
    (0, common_1.Patch)('me/online'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('isOnline')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Boolean]),
    __metadata("design:returntype", Promise)
], MitraController.prototype, "setOnlineStatus", null);
__decorate([
    (0, common_1.Patch)('me/location'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('latitude')),
    __param(2, (0, common_1.Body)('longitude')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", Promise)
], MitraController.prototype, "updateLocation", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(optional_jwt_auth_guard_1.OptionalJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], MitraController.prototype, "getMitraById", null);
__decorate([
    (0, common_1.Get)('me/services'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MitraController.prototype, "getMyServices", null);
__decorate([
    (0, common_1.Post)('me/services'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_mitra_service_dto_1.CreateMitraServiceDto]),
    __metadata("design:returntype", Promise)
], MitraController.prototype, "createService", null);
__decorate([
    (0, common_1.Patch)('me/services/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, update_mitra_service_dto_1.UpdateMitraServiceDto]),
    __metadata("design:returntype", Promise)
], MitraController.prototype, "updateService", null);
__decorate([
    (0, common_1.Delete)('me/services/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], MitraController.prototype, "deleteService", null);
exports.MitraController = MitraController = __decorate([
    (0, common_1.Controller)('mitra'),
    __metadata("design:paramtypes", [mitra_service_1.MitraService])
], MitraController);
//# sourceMappingURL=mitra.controller.js.map