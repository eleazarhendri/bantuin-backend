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
            nik: string;
            ktpUrl: string;
            selfieUrl: string;
            serviceCategory: string;
            experience: string;
            userId: number;
            status: string;
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
}
export {};
