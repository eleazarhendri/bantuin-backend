import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto, GetOrCreateConversationDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest {
  user: { id: number; email: string; role: string };
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ── GET /chat/conversations — Semua conversation user ─────────────────────
  @Get('conversations')
  async getConversations(@Request() req: AuthenticatedRequest) {
    return this.chatService.getConversations(req.user.id);
  }

  // ── POST /chat/conversations — Buat atau ambil conversation ───────────────
  @Post('conversations')
  @HttpCode(HttpStatus.OK)
  async getOrCreate(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GetOrCreateConversationDto,
  ) {
    const conv = await this.chatService.getOrCreateConversation({
      userId: req.user.id,
      mitraId: dto.mitraId,
      orderId: dto.orderId,
      categoryName: dto.categoryName,
    });

    return {
      id: conv.id.toString(),
      order_id: conv.orderId?.toString() ?? conv.id.toString(),
      mitra_id: conv.mitraId.toString(),
      user_id: conv.userId.toString(),
      category_name: conv.categoryName,
    };
  }

  // ── GET /chat/conversations/:id/messages — Pesan dalam conversation ────────
  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.getMessages(id, req.user.id);
  }

  // ── POST /chat/messages — Kirim pesan ─────────────────────────────────────
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage({
      conversationId: dto.conversationId,
      senderId: req.user.id,
      content: dto.content,
      type: dto.type,
      imageUrl: dto.imageUrl,
    });
  }
}
