import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

/**
 * ChatGateway — WebSocket untuk real-time chat dan notifikasi.
 *
 * Namespace: /chat
 * Rooms:
 *  - notif:{userId}  → notifikasi personal (chat baru, order update, dll.)
 *  - conv:{convId}   → pesan dalam conversation tertentu
 *
 * Events server → client:
 *  - chat:message    → pesan baru di conversation
 *  - notif:new       → notifikasi baru
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;

      // Auto-join room notifikasi personal
      client.join(`notif:${payload.sub}`);
      this.logger.log(`[Chat WS] Connected: userId=${payload.sub} socketId=${client.id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[Chat WS] Disconnected: socketId=${client.id}`);
  }

  // ── Join conversation room ─────────────────────────────────────────────────

  @SubscribeMessage('join:conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const room = `conv:${data.conversationId}`;
    client.join(room);
    client.emit('joined:conversation', { room });
    this.logger.log(`[Chat WS] userId=${client.data.userId} joined ${room}`);
  }

  // ── Kirim pesan via WebSocket ──────────────────────────────────────────────

  @SubscribeMessage('chat:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: number;
      content: string;
      type?: string;
      imageUrl?: string;
    },
  ) {
    const senderId = client.data.userId;
    if (!senderId) return;

    try {
      const message = await this.chatService.sendMessage({
        conversationId: data.conversationId,
        senderId,
        content: data.content,
        type: data.type,
        imageUrl: data.imageUrl,
      });

      // Broadcast ke semua yang ada di room conversation
      this.server
        .to(`conv:${data.conversationId}`)
        .emit('chat:message', message);
    } catch (err) {
      client.emit('chat:error', { message: (err as Error).message });
    }
  }

  // ── Server-side: kirim notifikasi ke user ─────────────────────────────────

  sendNotification(userId: number, notification: object) {
    this.server.to(`notif:${userId}`).emit('notif:new', notification);
  }

  // ── Server-side: broadcast pesan ke conversation ──────────────────────────

  broadcastMessage(conversationId: number, message: object) {
    this.server.to(`conv:${conversationId}`).emit('chat:message', message);
  }
}
