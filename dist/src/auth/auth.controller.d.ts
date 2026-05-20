import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { UsersService } from '../users/users.service';
export declare class AuthController {
    private readonly authService;
    private readonly usersService;
    constructor(authService: AuthService, usersService: UsersService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
    }>;
    googleAuth(dto: GoogleAuthDto): Promise<{
        access_token: string;
    }>;
    getMe(req: {
        user: {
            id: number;
            email: string;
            role: string;
        };
    }): Promise<{
        id: number;
        email: string;
        name: string;
        photoUrl: string;
        role: string;
        isMitra: boolean;
        hasPassword: boolean;
    }>;
}
