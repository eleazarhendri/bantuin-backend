import { MitraService } from './mitra.service';
import { RegisterMitraDto } from './dto/register-mitra.dto';
import { UpdateMitraProfileDto } from './dto/update-mitra-profile.dto';
interface AuthenticatedRequest {
    user: {
        id: number;
        email: string;
        role: string;
    };
}
export declare class MitraController {
    private readonly mitraService;
    constructor(mitraService: MitraService);
    register(req: AuthenticatedRequest, dto: RegisterMitraDto): Promise<{
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
    getRegistrationStatus(req: AuthenticatedRequest): Promise<{
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
    searchMitras(category?: string, q?: string, minRating?: string, limit?: string, offset?: string): Promise<{
        data: object[];
        total: number;
    }>;
    getMyProfile(req: AuthenticatedRequest): Promise<object>;
    updateMyProfile(req: AuthenticatedRequest, dto: UpdateMitraProfileDto): Promise<object>;
    setOnlineStatus(req: AuthenticatedRequest, isOnline: boolean): Promise<object>;
    getMitraById(id: number): Promise<object>;
}
export {};
