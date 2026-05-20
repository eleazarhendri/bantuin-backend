import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly prisma;
    private readonly logger;
    private readonly BCRYPT_ROUNDS;
    private readonly googleClient;
    constructor(usersService: UsersService, jwtService: JwtService, prisma: PrismaService);
    private createInitialWallet;
    register(dto: RegisterDto): Promise<{
        access_token: string;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
    }>;
    googleAuth(dto: GoogleAuthDto): Promise<{
        access_token: string;
    }>;
    private generateTokenResponse;
}
