import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * POST /api/auth/register
   *
   * Mendaftarkan user baru dengan email dan password.
   *
   * Request body:
   * {
   *   "email": "farah@student.uny.ac.id",
   *   "password": "password123",
   *   "name": "Farah Aulia"
   * }
   *
   * Response 201:
   * { "access_token": "eyJhbGci..." }
   *
   * Response 409: Email sudah terdaftar
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /api/auth/login
   *
   * Login dengan email dan password.
   *
   * Request body:
   * {
   *   "email": "farah@student.uny.ac.id",
   *   "password": "password123"
   * }
   *
   * Response 200:
   * { "access_token": "eyJhbGci..." }
   *
   * Response 401: Email atau password salah
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /api/auth/google
   *
   * Login atau registrasi otomatis via Google.
   * Flutter mengirim idToken dari google_sign_in package.
   *
   * Request body:
   * {
   *   "token": "<Google ID Token dari Flutter>"
   * }
   *
   * Response 200:
   * { "access_token": "eyJhbGci..." }
   *
   * Response 401: Token Google tidak valid
   */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto);
  }

  /**
   * GET /api/auth/me
   *
   * Mengembalikan data profil lengkap user dari database.
   * Lebih lengkap dari JWT payload — termasuk name, photoUrl, isMitra, dll.
   *
   * Response 200:
   * {
   *   "id": 1,
   *   "email": "farah@student.uny.ac.id",
   *   "name": "Farah Aulia",
   *   "photoUrl": "https://lh3.googleusercontent.com/...",
   *   "role": "USER",
   *   "isMitra": false
   * }
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(
    @Request() req: { user: { id: number; email: string; role: string } },
  ) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) throw new NotFoundException('User tidak ditemukan');

    // Kembalikan data yang dibutuhkan Flutter — jangan expose password/googleId
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      photoUrl: user.photoUrl,
      role: user.role,
      isMitra: user.isMitra,
      // hasPassword: true jika akun daftar via email/password
      // false jika akun Google-only (tidak punya password)
      hasPassword: !!user.password,
    };
  }
}
