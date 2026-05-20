import { MitraService } from './mitra.service';
import { RegisterMitraDto } from './dto/register-mitra.dto';
import { UpdateMitraProfileDto } from './dto/update-mitra-profile.dto';
import { CreateMitraServiceDto } from './dto/create-mitra-service.dto';
import { UpdateMitraServiceDto } from './dto/update-mitra-service.dto';
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
    getRegistrationStatus(req: AuthenticatedRequest): Promise<{
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
    searchMitras(category?: string, q?: string, minRating?: string, limit?: string, offset?: string): Promise<{
        data: object[];
        total: number;
    }>;
    getMyProfile(req: AuthenticatedRequest): Promise<object>;
    updateMyProfile(req: AuthenticatedRequest, dto: UpdateMitraProfileDto): Promise<object>;
    setOnlineStatus(req: AuthenticatedRequest, isOnline: boolean): Promise<object>;
    updateLocation(req: AuthenticatedRequest, latitude: number, longitude: number): Promise<object>;
    getMitraById(id: number): Promise<object>;
    getMyServices(req: AuthenticatedRequest): Promise<{
        data: object[];
    }>;
    createService(req: AuthenticatedRequest, dto: CreateMitraServiceDto): Promise<{
        message: string;
        data: object;
    }>;
    updateService(id: number, req: AuthenticatedRequest, dto: UpdateMitraServiceDto): Promise<{
        message: string;
        data: object;
    }>;
    deleteService(id: number, req: AuthenticatedRequest): Promise<{
        message: string;
    }>;
}
export {};
