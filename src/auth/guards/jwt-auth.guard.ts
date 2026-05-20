import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard yang melindungi endpoint dengan JWT.
 *
 * Penggunaan di controller:
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Request() req) { return req.user; }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
