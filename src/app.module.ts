import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { MitraModule } from './mitra/mitra.module';
import { AdminModule } from './admin/admin.module';
import { OrdersModule } from './orders/orders.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    MitraModule,
    AdminModule,
    OrdersModule,
    ChatModule,
    NotificationsModule,
    ReviewsModule,
  ],
})
export class AppModule {}
