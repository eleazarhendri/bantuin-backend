"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OrdersGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
let OrdersGateway = OrdersGateway_1 = class OrdersGateway {
    constructor(jwtService) {
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(OrdersGateway_1.name);
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                this.logger.warn(`[WS] Client ${client.id} tanpa token — disconnect`);
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            client.data.userId = payload.sub;
            client.data.role = payload.role;
            this.logger.log(`[WS] Connected: userId=${payload.sub} role=${payload.role} socketId=${client.id}`);
        }
        catch {
            this.logger.warn(`[WS] Token invalid — disconnect ${client.id}`);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        this.logger.log(`[WS] Disconnected: socketId=${client.id}`);
    }
    handleJoin(client, data) {
        const userId = client.data.userId;
        if (!userId)
            return;
        const room = data?.role === 'mitra' ? `mitra:${userId}` : `user:${userId}`;
        client.join(room);
        this.logger.log(`[WS] userId=${userId} joined room: ${room}`);
        client.emit('joined', { room });
    }
    notifyMitraNewOrder(mitraId, order) {
        this.server.to(`mitra:${mitraId}`).emit('order:new', order);
        this.logger.log(`[WS] order:new → mitra:${mitraId}`);
    }
    notifyOrderStatusUpdated(userId, mitraId, order) {
        this.server.to(`user:${userId}`).emit('order:status_updated', order);
        this.server.to(`mitra:${mitraId}`).emit('order:status_updated', order);
        this.logger.log(`[WS] order:status_updated → user:${userId} & mitra:${mitraId}`);
    }
    notifyOrderCancelled(userId, mitraId, order) {
        this.server.to(`user:${userId}`).emit('order:cancelled', order);
        this.server.to(`mitra:${mitraId}`).emit('order:cancelled', order);
        this.logger.log(`[WS] order:cancelled → user:${userId} & mitra:${mitraId}`);
    }
};
exports.OrdersGateway = OrdersGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], OrdersGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], OrdersGateway.prototype, "handleJoin", null);
exports.OrdersGateway = OrdersGateway = OrdersGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
        namespace: '/orders',
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], OrdersGateway);
//# sourceMappingURL=orders.gateway.js.map