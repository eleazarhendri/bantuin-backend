import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatConversation, ChatMessage } from '@prisma/client';
type ConvWithUsers = ChatConversation & {
    user: {
        id: number;
        name: string | null;
        photoUrl: string | null;
    };
    mitra: {
        id: number;
        name: string | null;
        photoUrl: string | null;
    };
    messages: ChatMessage[];
};
export declare class ChatService {
    private readonly prisma;
    private readonly notificationsService;
    private readonly logger;
    constructor(prisma: PrismaService, notificationsService: NotificationsService);
    private formatConversation;
    private formatMessage;
    getOrCreateConversation(params: {
        userId: number;
        mitraId: number;
        orderId?: number;
        categoryName?: string;
    }): Promise<ConvWithUsers>;
    getConversations(userId: number): Promise<{
        id: string;
        order_id: string;
        partner_name: string;
        partner_avatar_url: string;
        mitra_id: string;
        last_message: string;
        last_message_at: Date;
        unread_count: number;
        order_status: string;
        category_name: string;
    }[]>;
    getMessages(conversationId: number, requesterId: number): Promise<{
        id: string;
        order_id: string;
        sender_id: string;
        sender_name: string;
        type: string;
        content: string;
        image_url: string;
        is_read: boolean;
        created_at: Date;
    }[]>;
    sendMessage(params: {
        conversationId: number;
        senderId: number;
        content: string;
        type?: string;
        imageUrl?: string;
    }): Promise<{
        id: string;
        order_id: string;
        sender_id: string;
        sender_name: string;
        type: string;
        content: string;
        image_url: string;
        is_read: boolean;
        created_at: Date;
    }>;
}
export {};
