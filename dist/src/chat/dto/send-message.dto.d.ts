export declare class SendMessageDto {
    conversationId: number;
    content: string;
    type?: string;
    imageUrl?: string;
}
export declare class GetOrCreateConversationDto {
    mitraId: number;
    orderId?: number;
    categoryName?: string;
}
