import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

/**
 * UsersModule — mengelola data user dan endpoint update profil.
 *
 * Catatan: JwtAuthGuard di UsersController bekerja karena JwtStrategy
 * sudah didaftarkan oleh AuthModule ke Passport secara global.
 * Tidak perlu import AuthModule di sini untuk menghindari circular dependency.
 */
@Module({
  imports: [
    // Multer untuk file upload di PATCH /users/update-profile
    MulterModule.register(),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
