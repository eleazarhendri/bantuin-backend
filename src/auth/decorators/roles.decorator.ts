import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator untuk menandai endpoint yang hanya bisa diakses role tertentu.
 *
 * Penggunaan:
 * @Roles('ADMIN')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Get('admin-only')
 * adminEndpoint() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
