import { AdminService } from './admin.service';
import { RejectRegistrationDto } from './dto/review-registration.dto';
interface AuthenticatedRequest {
    user: {
        id: number;
        email: string;
        role: string;
    };
}
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getAllApplications(status?: string): Promise<{
        data: import("./admin.service").RegistrationWithUser[];
        total: number;
    }>;
    getApplicationDetail(id: number): Promise<{
        data: import("./admin.service").RegistrationWithUser;
    }>;
    approveApplication(id: number, req: AuthenticatedRequest): Promise<{
        message: string;
        data: {
            registration: import(".prisma/client").MitraRegistration;
            user: import(".prisma/client").User;
        };
    }>;
    rejectApplication(id: number, dto: RejectRegistrationDto, req: AuthenticatedRequest): Promise<{
        message: string;
        data: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            userId: number;
            latitude: number | null;
            longitude: number | null;
            status: string;
            nik: string;
            ktpUrl: string;
            selfieUrl: string;
            serviceCategory: string;
            experience: string;
            adminNote: string | null;
            reviewedBy: number | null;
        };
    }>;
    resetApplicationForReview(id: number, dto: RejectRegistrationDto, req: AuthenticatedRequest): Promise<{
        message: string;
        data: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            userId: number;
            latitude: number | null;
            longitude: number | null;
            status: string;
            nik: string;
            ktpUrl: string;
            selfieUrl: string;
            serviceCategory: string;
            experience: string;
            adminNote: string | null;
            reviewedBy: number | null;
        };
    }>;
    getStats(): Promise<{
        pending: number;
        approved: number;
        rejected: number;
        total: number;
    }>;
    getOverview(): Promise<{
        total_users: number;
        total_mitras: number;
        total_orders: number;
        pending_orders: number;
        done_orders: number;
        total_platform_revenue: number;
        recent_orders: {
            id: number;
            user_name: string;
            mitra_name: string;
            category: string;
            status: string;
            amount: number;
            created_at: Date;
        }[];
    }>;
    getAllUsers(page?: string, limit?: string): Promise<{
        data: {
            id: number;
            email: string;
            name: string;
            photo_url: string;
            role: string;
            is_mitra: boolean;
            created_at: Date;
            total_orders_as_user: number;
            total_orders_as_mitra: number;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    getAllMitras(): Promise<{
        id: number;
        name: string;
        email: string;
        photo_url: string;
        category: string;
        rating: number;
        total_reviews: number;
        total_orders: number;
        is_online: boolean;
        is_verified: boolean;
        campus: string;
        domicile: string;
        joined_at: Date;
    }[]>;
    getAllOrders(page?: string, limit?: string, status?: string): Promise<{
        data: {
            id: number;
            user_name: string;
            user_email: string;
            mitra_name: string;
            mitra_email: string;
            category_name: string;
            status: string;
            total_amount: number;
            created_at: Date;
            completed_at: Date;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
}
export {};
