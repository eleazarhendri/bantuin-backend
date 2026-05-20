import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() agar PrismaService bisa di-inject di mana saja
// tanpa perlu import PrismaModule berulang kali
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
