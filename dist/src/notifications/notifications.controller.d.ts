import { NotificationsService } from './notifications.service';
interface AuthenticatedRequest {
    user: {
        id: number;
        email: string;
        role: string;
    };
}
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getMyNotifications(req: AuthenticatedRequest, limit?: string): Promise<{
        data: {
            id: number;
            type: string;
            title: string;
            body: string;
            data: any;
            is_read: boolean;
            created_at: Date;
        }[];
        unread_count: number;
    }>;
    markAllRead(req: AuthenticatedRequest): Promise<{
        message: string;
    }>;
    markRead(id: number, req: AuthenticatedRequest): Promise<{
        message: string;
    }>;
}
export {};
