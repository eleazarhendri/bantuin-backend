import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import bcrypt = require('bcrypt');
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '@prisma/client';

// Saldo awal uji coba untuk setiap user baru
const INITIAL_WALLET_BALANCE = 20_000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  // ── Helper: buat wallet awal untuk user baru ───────────────────────────────

  private async createInitialWallet(userId: number): Promise<void> {
    try {
      await this.prisma.wallet.upsert({
        where: { userId },
        create: {
          userId,
          balance: INITIAL_WALLET_BALANCE,
        },
        update: {}, // jangan update kalau sudah ada
      });

      await this.prisma.walletTransaction.create({
        data: {
          walletId: (await this.prisma.wallet.findUnique({ where: { userId } }))!.id,
          amount: INITIAL_WALLET_BALANCE,
          type: 'CREDIT',
          description: 'Saldo uji coba awal — selamat datang di Bantuin! 🎉',
        },
      });

      this.logger.log(
        `[WALLET] Saldo awal Rp ${INITIAL_WALLET_BALANCE.toLocaleString()} dibuat untuk userId=${userId}`,
      );
    } catch (err) {
      // Gagal buat wallet tidak boleh block register
      this.logger.error(`[WALLET] Gagal buat wallet untuk userId=${userId}: ${err}`);
    }
  }

  // ── Register dengan Email/Password ─────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ access_token: string }> {
    // Cek duplikasi email
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      this.logger.warn(`[REGISTER] Email sudah terdaftar: ${dto.email}`);
      throw new ConflictException('Email sudah terdaftar');
    }

    // Hash password — gunakan bcrypt.hash dengan salt rounds eksplisit
    const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // Sanity check: pastikan hash benar-benar berbeda dari plain text
    // dan bisa di-verify sebelum disimpan ke DB
    const hashVerified = await bcrypt.compare(dto.password, hashedPassword);
    if (!hashVerified) {
      // Ini tidak seharusnya terjadi — log sebagai critical error
      this.logger.error(
        `[REGISTER] CRITICAL: bcrypt hash verification gagal untuk ${dto.email}`,
      );
      throw new Error('Gagal memproses password. Coba lagi.');
    }

    const user = await this.usersService.createWithEmail({
      email: dto.email,
      hashedPassword,
      name: dto.name,
    });

    this.logger.log(
      `[REGISTER] Berhasil: ${user.email} (id: ${user.id}) | hash_prefix: ${hashedPassword.substring(0, 10)}...`,
    );

    // Buat wallet awal dengan saldo uji coba
    await this.createInitialWallet(user.id);

    return this.generateTokenResponse(user);
  }

  // ── Login dengan Email/Password ────────────────────────────────────────────

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    this.logger.debug(`[LOGIN] Mencoba login untuk email: ${dto.email}`);

    // ── Step 1: Cari user ──────────────────────────────────────────────────
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      this.logger.warn(`[LOGIN] GAGAL — Email tidak ditemukan: ${dto.email}`);
      // Pesan generik untuk mencegah user enumeration attack
      throw new UnauthorizedException('Email atau password salah');
    }

    this.logger.debug(
      `[LOGIN] User ditemukan: ${user.email} | has_password: ${!!user.password} | password_hash_prefix: ${user.password?.substring(0, 10) ?? 'NULL'}...`,
    );

    // ── Step 2: Cek apakah akun punya password ─────────────────────────────
    if (!user.password) {
      this.logger.warn(
        `[LOGIN] GAGAL — Akun ${dto.email} tidak punya password (akun Google-only)`,
      );
      throw new UnauthorizedException(
        'Akun ini terdaftar via Google. Silakan login dengan Google.',
      );
    }

    // ── Step 3: Bandingkan password dengan bcrypt ──────────────────────────
    // bcrypt.compare(plainText, hash) — urutan parameter PENTING
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    this.logger.debug(
      `[LOGIN] bcrypt.compare result untuk ${dto.email}: ${isPasswordValid}`,
    );

    if (!isPasswordValid) {
      this.logger.warn(
        `[LOGIN] GAGAL — Password tidak cocok untuk: ${dto.email}`,
      );
      throw new UnauthorizedException('Email atau password salah');
    }

    // ── Step 4: Login berhasil ─────────────────────────────────────────────
    this.logger.log(`[LOGIN] BERHASIL: ${user.email} (id: ${user.id})`);

    return this.generateTokenResponse(user);
  }

  // ── Login dengan Google ────────────────────────────────────────────────────

  /**
   * Login atau registrasi otomatis via Google ID Token.
   *
   * Alur:
   * 1. Verifikasi ID Token menggunakan google-auth-library
   *    → Memastikan token asli dari Google, tidak dipalsukan
   * 2. Ekstrak payload: email, name, sub (Google Subject ID)
   * 3. Cek apakah user sudah ada berdasarkan googleId
   * 4. Jika belum ada via googleId, cek berdasarkan email:
   *    a. Ada → link googleId ke akun yang sudah ada (akun lama daftar email)
   *    b. Tidak ada → buat user baru tanpa password
   * 5. Kembalikan access_token JWT
   */
  async googleAuth(dto: GoogleAuthDto): Promise<{ access_token: string }> {
    // ── Verifikasi token ke server Google ──────────────────────────────────
    let googlePayload: {
      sub: string;
      email: string;
      name: string;
      photoUrl: string | null;
    };

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
        // Gunakan displayName dari Google — bukan potongan email
        name: payload.name ?? payload.email.split('@')[0],
        // picture adalah URL foto profil Google (resolusi tinggi)
        photoUrl: payload.picture ?? null,
      };
    } catch (error) {
      this.logger.warn(`Google token verification failed: ${error}`);
      throw new UnauthorizedException('Google token tidak valid atau sudah expired');
    }

    // ── Cari atau buat user ────────────────────────────────────────────────
    let user = await this.usersService.findByGoogleId(googlePayload.sub);

    if (!user) {
      const existingByEmail = await this.usersService.findByEmail(
        googlePayload.email,
      );

      if (existingByEmail) {
        // Akun sudah ada (daftar via email) → link googleId + update foto
        user = await this.usersService.linkGoogleId(
          existingByEmail.id,
          googlePayload.sub,
          googlePayload.name,
          googlePayload.photoUrl ?? undefined,
        );
        this.logger.log(
          `[GOOGLE] Google ID di-link ke akun existing: ${user.email}`,
        );
      } else {
        // Belum ada akun → buat baru dengan data lengkap dari Google
        user = await this.usersService.createWithGoogle({
          email: googlePayload.email,
          name: googlePayload.name,
          googleId: googlePayload.sub,
          photoUrl: googlePayload.photoUrl ?? undefined,
        });
        this.logger.log(
          `[GOOGLE] User baru: ${user.email} (id: ${user.id}) | photo: ${!!googlePayload.photoUrl}`,
        );
        // Buat wallet awal untuk user Google baru
        await this.createInitialWallet(user.id);
      }
    } else {
      // User sudah ada via googleId — update foto jika berubah
      if (googlePayload.photoUrl && !user.photoUrl) {
        user = await this.usersService.linkGoogleId(
          user.id,
          googlePayload.sub,
          googlePayload.name,
          googlePayload.photoUrl,
        );
      }
    }

    return this.generateTokenResponse(user);
  }

  // ── Helper ─────────────────────────────────────────────────────────────────

  /**
   * Membuat JWT access token dari data user.
   * Payload minimal: sub (user id), email, role.
   */
  private generateTokenResponse(user: User): { access_token: string } {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
