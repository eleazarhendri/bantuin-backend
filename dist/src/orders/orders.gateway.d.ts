import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
export declare class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    server: Server;
    private readonly logger;
    constructor(jwtService: JwtService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleJoin(client: Socket, data: {
        role: 'user' | 'mitra';
    }): void;
    notifyMitraNewOrder(mitraId: number, order: object): void;
    notifyOrderStatusUpdated(userId: number, mitraId: number, order: object): void;
    notifyOrderCancelled(userId: number, mitraId: number, order: object): void;
}
