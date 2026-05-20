import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<User | null>;
    findByGoogleId(googleId: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    createWithEmail(data: {
        email: string;
        hashedPassword: string;
        name: string;
    }): Promise<User>;
    createWithGoogle(data: {
        email: string;
        name: string;
        googleId: string;
        photoUrl?: string;
    }): Promise<User>;
    linkGoogleId(userId: number, googleId: string, googleName?: string, googlePhotoUrl?: string): Promise<User>;
    updateProfile(userId: number, data: {
        name?: string;
        photoUrl?: string;
    }): Promise<User>;
    setMitraStatus(userId: number, isMitra: boolean): Promise<User>;
}
