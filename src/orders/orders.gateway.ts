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

/**
 * OrdersGateway — WebSocket gateway untuk real-time order updates.
 *
 * Rooms:
 *  - user:{userId}   → user menerima update status pesanannya
 *  - mitra:{mitraId} → mitra menerima pesanan baru & update
 *
 * Events yang dikirim server → client:
 *  - order:new          → mitra mendapat pesanan baru
 *  - order:status_updated → user/mitra mendapat update status
 *  - order:cancelled    → pesanan dibatalkan
 */
@WebSocketGateway({
  cors: {
    origin: '*', // Sesuaikan dengan domain Flutter app di production
  },
  namespace: '/orders',
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`[WS] Client ${client.id} tanpa token — disconnect`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      // Simpan userId di socket data untuk dipakai di handlers
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      this.logger.log(
        `[WS] Connected: userId=${payload.sub} role=${payload.role} socketId=${client.id}`,
      );
    } catch {
      this.logger.warn(`[WS] Token invalid — disconnect ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[WS] Disconnected: socketId=${client.id}`);
  }

  // ── Subscribe Messages ─────────────────────────────────────────────────────

  /**
   * Client join room berdasarkan role:
   * - USER  → join room "user:{userId}"
   * - MITRA → join room "mitra:{userId}"
   */
  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { role: 'user' | 'mitra' },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const room =
      data?.role === 'mitra' ? `mitra:${userId}` : `user:${userId}`;
    client.join(room);
    this.logger.log(`[WS] userId=${userId} joined room: ${room}`);
    client.emit('joined', { room });
  }

  // ── Server-side emit helpers ───────────────────────────────────────────────

  /**
   * Kirim pesanan baru ke mitra.
   */
  notifyMitraNewOrder(mitraId: number, order: object) {
    this.server.to(`mitra:${mitraId}`).emit('order:new', order);
    this.logger.log(`[WS] order:new → mitra:${mitraId}`);
  }

  /**
   * Kirim update status ke user dan mitra yang terlibat.
   */
  notifyOrderStatusUpdated(userId: number, mitraId: number, order: object) {
    this.server.to(`user:${userId}`).emit('order:status_updated', order);
    this.server.to(`mitra:${mitraId}`).emit('order:status_updated', order);
    this.logger.log(
      `[WS] order:status_updated → user:${userId} & mitra:${mitraId}`,
    );
  }

  /**
   * Kirim notifikasi pembatalan ke user dan mitra.
   */
  notifyOrderCancelled(userId: number, mitraId: number, order: object) {
    this.server.to(`user:${userId}`).emit('order:cancelled', order);
    this.server.to(`mitra:${mitraId}`).emit('order:cancelled', order);
    this.logger.log(
      `[WS] order:cancelled → user:${userId} & mitra:${mitraId}`,
    );
  }
}
