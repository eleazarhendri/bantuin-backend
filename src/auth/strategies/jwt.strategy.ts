import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * JWT Strategy untuk Passport.
 *
 * Cara kerja:
 * 1. Setiap request yang butuh autentikasi harus menyertakan header:
 *    Authorization: Bearer <access_token>
 * 2. Strategy ini mengekstrak token, memverifikasi signature dengan JWT_SECRET,
 *    lalu memanggil validate() dengan payload yang sudah ter-decode.
 * 3. Return value dari validate() akan tersedia di request.user.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      // Ekstrak token dari header Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Tolak token yang sudah expired
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'fallback-secret-change-in-production',
    });
  }

  /**
   * Dipanggil setelah JWT berhasil diverifikasi.
   * Validasi tambahan: pastikan user masih ada di database
   * (misal: akun belum dihapus sejak token diterbitkan).
   */
  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Token tidak valid atau akun tidak ditemukan');
    }

    // Objek ini akan tersedia sebagai request.user di controller
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
