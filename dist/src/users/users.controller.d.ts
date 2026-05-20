import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
interface AuthenticatedRequest {
    user: {
        id: number;
        email: string;
        role: string;
    };
}
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    updateProfile(req: AuthenticatedRequest, dto: UpdateProfileDto, file?: Express.Multer.File): Promise<{
        id: number;
        email: string;
        name: string;
        photoUrl: string;
        role: string;
        isMitra: boolean;
    }>;
}
export {};
