import { ChatService } from './chat.service';
import { SendMessageDto, GetOrCreateConversationDto } from './dto/send-message.dto';
interface AuthenticatedRequest {
    user: {
        id: number;
        email: string;
        role: string;
    };
}
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    getConversations(req: AuthenticatedRequest): Promise<{
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
    getOrCreate(req: AuthenticatedRequest, dto: GetOrCreateConversationDto): Promise<{
        id: string;
        order_id: string;
        mitra_id: string;
        user_id: string;
        category_name: string;
    }>;
    getMessages(id: number, req: AuthenticatedRequest): Promise<{
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
    sendMessage(req: AuthenticatedRequest, dto: SendMessageDto): Promise<{
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
