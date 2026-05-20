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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const users_service_1 = require("./users.service");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const UPLOAD_DIR = (0, path_1.join)(process.cwd(), 'public', 'uploads');
if (!(0, fs_1.existsSync)(UPLOAD_DIR)) {
    (0, fs_1.mkdirSync)(UPLOAD_DIR, { recursive: true });
}
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async updateProfile(req, dto, file) {
        const photoUrl = file
            ? `${process.env.BASE_URL ?? 'http://192.168.100.112:3000'}/uploads/${file.filename}`
            : undefined;
        const updated = await this.usersService.updateProfile(req.user.id, {
            name: dto.name,
            photoUrl,
        });
        return {
            id: updated.id,
            email: updated.email,
            name: updated.name,
            photoUrl: updated.photoUrl,
            role: updated.role,
            isMitra: updated.isMitra,
        };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Patch)('update-profile'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo', {
        storage: (0, multer_1.diskStorage)({
            destination: UPLOAD_DIR,
            filename: (_req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
                const ext = (0, path_1.extname)(file.originalname).toLowerCase();
                cb(null, `photo-${uniqueSuffix}${ext}`);
            },
        }),
        fileFilter: (_req, file, cb) => {
            const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
            const ext = (0, path_1.extname)(file.originalname).toLowerCase();
            if (!allowed.includes(ext)) {
                return cb(new common_1.BadRequestException('Format file tidak didukung. Gunakan JPG, PNG, atau WebP.'), false);
            }
            cb(null, true);
        },
        limits: {
            fileSize: 5 * 1024 * 1024,
        },
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map