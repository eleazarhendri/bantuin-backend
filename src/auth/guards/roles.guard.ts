import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard yang memvalidasi role user dari JWT payload.
 *
 * Harus dipakai BERSAMA JwtAuthGuard — JwtAuthGuard mengisi req.user,
 * lalu RolesGuard membaca req.user.role untuk validasi.
 *
 * Penggunaan:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('ADMIN')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Ambil roles yang dibutuhkan dari metadata decorator @Roles(...)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Jika tidak ada @Roles decorator, endpoint terbuka untuk semua role
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Ambil user dari request (sudah diisi oleh JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest<{
      user: { id: number; email: string; role: string };
    }>();

    const hasRole = requiredRoles.includes(user?.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Akses ditolak. Endpoint ini membutuhkan role: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
