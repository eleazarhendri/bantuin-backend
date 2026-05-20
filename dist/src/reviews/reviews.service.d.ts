import { PrismaService } from '../prisma/prisma.service';
export declare class ReviewsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    submitReview(userId: number, orderId: number, rating: number, comment: string): Promise<{
        id: string;
        order_id: string;
        user_id: string;
        user_name: string;
        user_avatar_url: string;
        mitra_id: string;
        rating: number;
        comment: string;
        created_at: Date;
    }>;
    getReviewsByMitra(mitraId: number): Promise<{
        id: string;
        order_id: string;
        user_id: string;
        user_name: string;
        user_avatar_url: string;
        mitra_id: string;
        rating: number;
        comment: string;
        created_at: Date;
    }[]>;
}
