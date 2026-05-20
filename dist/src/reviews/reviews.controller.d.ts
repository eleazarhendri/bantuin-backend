import { ReviewsService } from './reviews.service';
declare class CreateReviewDto {
    rating: number;
    comment: string;
}
interface AuthenticatedRequest {
    user: {
        id: number;
        email: string;
        role: string;
    };
}
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    submitReview(orderId: number, req: AuthenticatedRequest, dto: CreateReviewDto): Promise<{
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
    getMitraReviews(mitraId: number): Promise<{
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
export {};
