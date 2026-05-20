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
var ChatGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const chat_service_1 = require("./chat.service");
let ChatGateway = ChatGateway_1 = class ChatGateway {
    constructor(jwtService, chatService) {
        this.jwtService = jwtService;
        this.chatService = chatService;
        this.logger = new common_1.Logger(ChatGateway_1.name);
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            client.data.userId = payload.sub;
            client.join(`notif:${payload.sub}`);
            this.logger.log(`[Chat WS] Connected: userId=${payload.sub} socketId=${client.id}`);
        }
        catch {
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        this.logger.log(`[Chat WS] Disconnected: socketId=${client.id}`);
    }
    handleJoinConversation(client, data) {
        const room = `conv:${data.conversationId}`;
        client.join(room);
        client.emit('joined:conversation', { room });
        this.logger.log(`[Chat WS] userId=${client.data.userId} joined ${room}`);
    }
    async handleSendMessage(client, data) {
        const senderId = client.data.userId;
        if (!senderId)
            return;
        try {
            const message = await this.chatService.sendMessage({
                conversationId: data.conversationId,
                senderId,
                content: data.content,
                type: data.type,
                imageUrl: data.imageUrl,
            });
            this.server
                .to(`conv:${data.conversationId}`)
                .emit('chat:message', message);
        }
        catch (err) {
            client.emit('chat:error', { message: err.message });
        }
    }
    sendNotification(userId, notification) {
        this.server.to(`notif:${userId}`).emit('notif:new', notification);
    }
    broadcastMessage(conversationId, message) {
        this.server.to(`conv:${conversationId}`).emit('chat:message', message);
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join:conversation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:send'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
exports.ChatGateway = ChatGateway = ChatGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
        namespace: '/chat',
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        chat_service_1.ChatService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map