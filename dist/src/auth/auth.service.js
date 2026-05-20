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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const google_auth_library_1 = require("google-auth-library");
const bcrypt = require("bcrypt");
const users_service_1 = require("../users/users.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(usersService, jwtService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.BCRYPT_ROUNDS = 12;
        this.googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }
    async register(dto) {
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing) {
            this.logger.warn(`[REGISTER] Email sudah terdaftar: ${dto.email}`);
            throw new common_1.ConflictException('Email sudah terdaftar');
        }
        const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);
        const hashVerified = await bcrypt.compare(dto.password, hashedPassword);
        if (!hashVerified) {
            this.logger.error(`[REGISTER] CRITICAL: bcrypt hash verification gagal untuk ${dto.email}`);
            throw new Error('Gagal memproses password. Coba lagi.');
        }
        const user = await this.usersService.createWithEmail({
            email: dto.email,
            hashedPassword,
            name: dto.name,
        });
        this.logger.log(`[REGISTER] Berhasil: ${user.email} (id: ${user.id}) | hash_prefix: ${hashedPassword.substring(0, 10)}...`);
        return this.generateTokenResponse(user);
    }
    async login(dto) {
        this.logger.debug(`[LOGIN] Mencoba login untuk email: ${dto.email}`);
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            this.logger.warn(`[LOGIN] GAGAL — Email tidak ditemukan: ${dto.email}`);
            throw new common_1.UnauthorizedException('Email atau password salah');
        }
        this.logger.debug(`[LOGIN] User ditemukan: ${user.email} | has_password: ${!!user.password} | password_hash_prefix: ${user.password?.substring(0, 10) ?? 'NULL'}...`);
        if (!user.password) {
            this.logger.warn(`[LOGIN] GAGAL — Akun ${dto.email} tidak punya password (akun Google-only)`);
            throw new common_1.UnauthorizedException('Akun ini terdaftar via Google. Silakan login dengan Google.');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        this.logger.debug(`[LOGIN] bcrypt.compare result untuk ${dto.email}: ${isPasswordValid}`);
        if (!isPasswordValid) {
            this.logger.warn(`[LOGIN] GAGAL — Password tidak cocok untuk: ${dto.email}`);
            throw new common_1.UnauthorizedException('Email atau password salah');
        }
        this.logger.log(`[LOGIN] BERHASIL: ${user.email} (id: ${user.id})`);
        return this.generateTokenResponse(user);
    }
    async googleAuth(dto) {
        let googlePayload;
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: dto.token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            if (!payload || !payload.email || !payload.sub) {
                throw new Error('Payload Google tidak lengkap');
            }
            googlePayload = {
                sub: payload.sub,
                email: payload.email,
                name: payload.name ?? payload.email.split('@')[0],
                photoUrl: payload.picture ?? null,
            };
        }
        catch (error) {
            this.logger.warn(`Google token verification failed: ${error}`);
            throw new common_1.UnauthorizedException('Google token tidak valid atau sudah expired');
        }
        let user = await this.usersService.findByGoogleId(googlePayload.sub);
        if (!user) {
            const existingByEmail = await this.usersService.findByEmail(googlePayload.email);
            if (existingByEmail) {
                user = await this.usersService.linkGoogleId(existingByEmail.id, googlePayload.sub, googlePayload.name, googlePayload.photoUrl ?? undefined);
                this.logger.log(`[GOOGLE] Google ID di-link ke akun existing: ${user.email}`);
            }
            else {
                user = await this.usersService.createWithGoogle({
                    email: googlePayload.email,
                    name: googlePayload.name,
                    googleId: googlePayload.sub,
                    photoUrl: googlePayload.photoUrl ?? undefined,
                });
                this.logger.log(`[GOOGLE] User baru: ${user.email} (id: ${user.id}) | photo: ${!!googlePayload.photoUrl}`);
            }
        }
        else {
            if (googlePayload.photoUrl && !user.photoUrl) {
                user = await this.usersService.linkGoogleId(user.id, googlePayload.sub, googlePayload.name, googlePayload.photoUrl);
            }
        }
        return this.generateTokenResponse(user);
    }
    generateTokenResponse(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map