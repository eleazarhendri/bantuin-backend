import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest {
  user: { id: number; email: string; role: string };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── GET /notifications — Ambil notifikasi user ────────────────────────────
  @Get()
  async getMyNotifications(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const data = await this.notificationsService.getByUser(
      req.user.id,
      limit ? parseInt(limit, 10) : 30,
    );
    const unread = await this.notificationsService.countUnread(req.user.id);
    return { data, unread_count: unread };
  }

  // ── PATCH /notifications/read-all — Tandai semua dibaca ──────────────────
  @Patch('read-all')
  async markAllRead(@Request() req: AuthenticatedRequest) {
    await this.notificationsService.markAllRead(req.user.id);
    return { message: 'Semua notifikasi ditandai dibaca.' };
  }

  // ── PATCH /notifications/:id/read — Tandai satu dibaca ───────────────────
  @Patch(':id/read')
  async markRead(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.notificationsService.markRead(id, req.user.id);
    return { message: 'Notifikasi ditandai dibaca.' };
  }
}
