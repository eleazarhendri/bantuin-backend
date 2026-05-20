import { Module } from '@nestjs/common';
import { MitraController } from './mitra.controller';
import { MitraService } from './mitra.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // AuthModule di-import agar JwtAuthGuard bisa dipakai
    AuthModule,
  ],
  controllers: [MitraController],
  providers: [MitraService],
  exports: [MitraService],
})
export class MitraModule {}
