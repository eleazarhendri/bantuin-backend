import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard JWT opsional — tidak melempar error jika token tidak ada.
 * Berguna untuk endpoint publik yang tetap bisa memanfaatkan info user
 * jika token tersedia (misal: personalisasi hasil pencarian).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // Override handleRequest agar tidak throw jika tidak ada token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(_err: any, user: any): any {
    // Jika ada error atau tidak ada user, kembalikan null (bukan throw)
    return user ?? null;
  }
}
