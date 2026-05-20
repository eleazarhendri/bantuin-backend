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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const review_registration_dto_1 = require("./dto/review-registration.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let AdminController = class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }
    async getAllApplications(status) {
        const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
        const normalizedStatus = status && validStatuses.includes(status.toUpperCase())
            ? status.toUpperCase()
            : 'PENDING';
        const data = await this.adminService.getAllRegistrations(normalizedStatus);
        return {
            data,
            total: data.length,
        };
    }
    async getApplicationDetail(id) {
        const data = await this.adminService.getRegistrationById(id);
        return { data };
    }
    async approveApplication(id, req) {
        const result = await this.adminService.approveRegistration(id, req.user.id);
        return {
            message: `Pendaftaran ID ${id} berhasil disetujui. User sekarang bisa beralih ke mode Mitra.`,
            data: result,
        };
    }
    async rejectApplication(id, dto, req) {
        const result = await this.adminService.rejectRegistration(id, req.user.id, dto.adminNote);
        return {
            message: `Pendaftaran ID ${id} ditolak.`,
            data: result,
        };
    }
    async getStats() {
        return this.adminService.getRegistrationStats();
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('mitra-applications'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllApplications", null);
__decorate([
    (0, common_1.Get)('mitra-applications/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getApplicationDetail", null);
__decorate([
    (0, common_1.Put)('mitra-applications/:id/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "approveApplication", null);
__decorate([
    (0, common_1.Put)('mitra-applications/:id/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, review_registration_dto_1.RejectRegistrationDto, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "rejectApplication", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getStats", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map