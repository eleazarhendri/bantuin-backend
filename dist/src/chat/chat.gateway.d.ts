import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    private readonly chatService;
    server: Server;
    private readonly logger;
    constructor(jwtService: JwtService, chatService: ChatService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleJoinConversation(client: Socket, data: {
        conversationId: number;
    }): void;
    handleSendMessage(client: Socket, data: {
        conversationId: number;
        content: string;
        type?: string;
        imageUrl?: string;
    }): Promise<void>;
    sendNotification(userId: number, notification: object): void;
    broadcastMessage(conversationId: number, message: object): void;
}
