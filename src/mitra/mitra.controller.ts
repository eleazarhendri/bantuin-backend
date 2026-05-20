import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { MitraService } from './mitra.service';
import { RegisterMitraDto } from './dto/register-mitra.dto';
import { UpdateMitraProfileDto } from './dto/update-mitra-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

interface AuthenticatedRequest {
  user: { id: number; email: string; role: string };
}

@Controller('mitra')
export class MitraController {
  constructor(private readonly mitraService: MitraService) {}

  // ── POST /api/mitra/register — Daftar sebagai mitra ──────────────────────
  @Post('register')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RegisterMitraDto,
  ) {
    const registration = await this.mitraService.submitRegistration(
      req.user.id,
      dto,
    );
    return {
      message:
        'Pendaftaran berhasil dikirim. Tim Bantuin akan memverifikasi dalam 1×24 jam.',
      data: registration,
    };
  }

  // ── GET /api/mitra/registration-status — Cek status pendaftaran ──────────
  @Get('registration-status')
  @UseGuards(JwtAuthGuard)
  async getRegistrationStatus(@Request() req: AuthenticatedRequest) {
    const registration = await this.mitraService.getMyRegistrationStatus(
      req.user.id,
    );
    return { data: registration };
  }

  // ── GET /api/mitra/search — Cari mitra aktif ─────────────────────────────
  /**
   * Query params:
   *  - category  : filter kategori (jastip, servis, les, beberes, desain, pindahan, joki, curhat)
   *  - q         : pencarian nama/deskripsi
   *  - minRating : rating minimum (0-5)
   *  - limit     : jumlah hasil (default 20)
   *  - offset    : pagination offset (default 0)
   *
   * Tidak butuh auth — bisa diakses tanpa login.
   */
  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  async searchMitras(
    @Query('category') category?: string,
    @Query('q') q?: string,
    @Query('minRating') minRating?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.mitraService.searchMitras({
      categoryId: category,
      query: q,
      minRating: minRating ? parseFloat(minRating) : undefined,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return result;
  }

  // ── GET /api/mitra/me — Profil mitra yang sedang login ───────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req: AuthenticatedRequest) {
    return this.mitraService.getMitraById(req.user.id);
  }

  // ── PATCH /api/mitra/me — Update profil mitra ────────────────────────────
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateMitraProfileDto,
  ) {
    return this.mitraService.updateMitraProfile(req.user.id, dto);
  }

  // ── PATCH /api/mitra/me/online — Toggle status online ────────────────────
  @Patch('me/online')
  @UseGuards(JwtAuthGuard)
  async setOnlineStatus(
    @Request() req: AuthenticatedRequest,
    @Body('isOnline') isOnline: boolean,
  ) {
    return this.mitraService.setOnlineStatus(req.user.id, isOnline);
  }

  // ── GET /api/mitra/:id — Profil mitra by userId ───────────────────────────
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getMitraById(@Param('id', ParseIntPipe) id: number) {
    return this.mitraService.getMitraById(id);
  }
}
