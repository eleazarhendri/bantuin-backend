import { PrismaService } from '../prisma/prisma.service';
import { RegisterMitraDto } from './dto/register-mitra.dto';
import { MitraRegistration, MitraProfile, User } from '@prisma/client';
export declare const RegistrationStatus: {
    readonly PENDING: "PENDING";
    readonly APPROVED: "APPROVED";
    readonly REJECTED: "REJECTED";
};
export type MitraWithUser = MitraProfile & {
    user: User;
};
export declare class MitraService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    submitRegistration(userId: number, dto: RegisterMitraDto): Promise<MitraRegistration>;
    getMyRegistrationStatus(userId: number): Promise<MitraRegistration | null>;
    searchMitras(params: {
        categoryId?: string;
        query?: string;
        minRating?: number;
        limit?: number;
        offset?: number;
    }): Promise<{
        data: object[];
        total: number;
    }>;
    getMitraById(mitraUserId: number): Promise<object>;
    setOnlineStatus(userId: number, isOnline: boolean): Promise<object>;
    updateMitraProfile(userId: number, data: {
        description?: string;
        bio?: string;
        price?: number;
        campus?: string;
        domicile?: string;
        phoneNumber?: string;
    }): Promise<object>;
    formatMitraProfile(profile: MitraWithUser): object;
}
