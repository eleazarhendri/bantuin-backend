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
}
