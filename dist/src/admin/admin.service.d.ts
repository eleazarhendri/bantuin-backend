import { PrismaService } from '../prisma/prisma.service';
import { MitraRegistration, User } from '@prisma/client';
export type RegistrationWithUser = MitraRegistration & {
    user: User;
};
export declare class AdminService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getAllRegistrations(status?: string): Promise<RegistrationWithUser[]>;
    getRegistrationById(id: number): Promise<RegistrationWithUser>;
    approveRegistration(registrationId: number, adminId: number): Promise<{
        registration: MitraRegistration;
        user: User;
    }>;
    rejectRegistration(registrationId: number, adminId: number, adminNote?: string): Promise<MitraRegistration>;
    getRegistrationStats(): Promise<{
        pending: number;
        approved: number;
        rejected: number;
        total: number;
    }>;
    getAllUsers(page?: number, limit?: number): Promise<{
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
    getAllActiveMitras(): Promise<{
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
    getAllOrders(page?: number, limit?: number, status?: string): Promise<{
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
    getDashboardOverview(): Promise<{
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
}
