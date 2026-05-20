import { PrismaService } from '../prisma/prisma.service';
import { Notification } from '@prisma/client';
export type NotifType = 'order' | 'chat' | 'balance' | 'system' | 'promo';
export declare class NotificationsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(params: {
        userId: number;
        type: NotifType;
        title: string;
        body: string;
        data?: Record<string, unknown>;
    }): Promise<Notification>;
    getByUser(userId: number, limit?: number): Promise<{
        id: number;
        type: string;
        title: string;
        body: string;
        data: any;
        is_read: boolean;
        created_at: Date;
    }[]>;
    markRead(notifId: number, userId: number): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllRead(userId: number): Promise<import(".prisma/client").Prisma.BatchPayload>;
    countUnread(userId: number): Promise<number>;
    notifyNewOrder(params: {
        mitraId: number;
        orderId: number;
        userName: string;
        categoryName: string;
    }): Promise<{
        id: number;
        createdAt: Date;
        data: string | null;
        userId: number;
        type: string;
        title: string;
        body: string;
        isRead: boolean;
    }>;
    notifyOrderStatusUpdate(params: {
        userId: number;
        orderId: number;
        mitraName: string;
        newStatus: string;
    }): Promise<{
        id: number;
        createdAt: Date;
        data: string | null;
        userId: number;
        type: string;
        title: string;
        body: string;
        isRead: boolean;
    }>;
    notifyNewChat(params: {
        recipientId: number;
        senderName: string;
        message: string;
        conversationId: number;
    }): Promise<{
        id: number;
        createdAt: Date;
        data: string | null;
        userId: number;
        type: string;
        title: string;
        body: string;
        isRead: boolean;
    }>;
    notifyBalanceCredited(params: {
        mitraId: number;
        amount: number;
        orderId: number;
    }): Promise<{
        id: number;
        createdAt: Date;
        data: string | null;
        userId: number;
        type: string;
        title: string;
        body: string;
        isRead: boolean;
    }>;
}
