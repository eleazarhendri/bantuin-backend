import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { RejectRegistrationDto } from './dto/review-registration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthenticatedRequest {
  user: { id: number; email: string; role: string };
}

/**
 * AdminController — semua endpoint di sini hanya bisa diakses role ADMIN.
 *
 * Guard stack:
 * 1. JwtAuthGuard  → validasi token JWT, isi req.user
 * 2. RolesGuard    → cek req.user.role === 'ADMIN'
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /api/admin/mitra-applications
   *
   * Lihat semua pendaftaran mitra.
   * Query param ?status=PENDING|APPROVED|REJECTED (default: PENDING)
   *
   * Response 200:
   * {
   *   "data": [
   *     {
   *       "id": 1,
   *       "status": "PENDING",
   *       "nik": "3404...",
   *       "serviceCategory": "jastip",
   *       "experience": "...",
   *       "ktpUrl": "...",
   *       "selfieUrl": "...",
   *       "createdAt": "...",
   *       "user": { "id": 5, "name": "Farah", "email": "farah@..." }
   *     }
   *   ],
   *   "total": 1
   * }
   */
  @Get('mitra-applications')
  async getAllApplications(@Query('status') status?: string) {
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    const normalizedStatus =
      status && validStatuses.includes(status.toUpperCase())
        ? status.toUpperCase()
        : 'PENDING';

    const data = await this.adminService.getAllRegistrations(normalizedStatus);

    return {
      data,
      total: data.length,
    };
  }

  /**
   * GET /api/admin/mitra-applications/:id
   *
   * Detail satu pendaftaran.
   */
  @Get('mitra-applications/:id')
  async getApplicationDetail(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adminService.getRegistrationById(id);
    return { data };
  }

  /**
   * PUT /api/admin/mitra-applications/:id/approve
   *
   * Setujui pendaftaran mitra.
   *
   * Efek:
   * - MitraRegistration.status → APPROVED
   * - User.isMitra → true
   * - User.role → "MITRA"
   *
   * Response 200:
   * {
   *   "message": "Pendaftaran berhasil disetujui.",
   *   "data": {
   *     "registration": { "id": 1, "status": "APPROVED", ... },
   *     "user": { "id": 5, "isMitra": true, "role": "MITRA", ... }
   *   }
   * }
   *
   * Response 400: Pendaftaran sudah diproses sebelumnya
   * Response 404: Pendaftaran tidak ditemukan
   */
  @Put('mitra-applications/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveApplication(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.adminService.approveRegistration(id, req.user.id);

    return {
      message: `Pendaftaran ID ${id} berhasil disetujui. User sekarang bisa beralih ke mode Mitra.`,
      data: result,
    };
  }

  /**
   * PUT /api/admin/mitra-applications/:id/reject
   *
   * Tolak pendaftaran mitra.
   *
   * Request body (opsional):
   * { "adminNote": "Foto KTP tidak jelas, harap upload ulang." }
   *
   * Response 200:
   * {
   *   "message": "Pendaftaran ditolak.",
   *   "data": { "id": 1, "status": "REJECTED", "adminNote": "...", ... }
   * }
   */
  @Put('mitra-applications/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectApplication(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectRegistrationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.adminService.rejectRegistration(
      id,
      req.user.id,
      dto.adminNote,
    );

    return {
      message: `Pendaftaran ID ${id} ditolak.`,
      data: result,
    };
  }

  /**
   * GET /api/admin/stats
   *
   * Statistik ringkasan pendaftaran untuk dashboard admin.
   *
   * Response 200:
   * { "pending": 5, "approved": 12, "rejected": 3, "total": 20 }
   */
  @Get('stats')
  async getStats() {
    return this.adminService.getRegistrationStats();
  }

  // ── GET /api/admin/overview — Dashboard overview ──────────────────────────
  @Get('overview')
  async getOverview() {
    return this.adminService.getDashboardOverview();
  }

  // ── GET /api/admin/users — Semua user ─────────────────────────────────────
  @Get('users')
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // ── GET /api/admin/mitras — Semua mitra aktif ─────────────────────────────
  @Get('mitras')
  async getAllMitras() {
    return this.adminService.getAllActiveMitras();
  }

  // ── GET /api/admin/orders — Semua pesanan ─────────────────────────────────
  @Get('orders')
  async getAllOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllOrders(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }
}
