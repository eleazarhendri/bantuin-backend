import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface AuthenticatedRequest {
  user: { id: number; email: string; role: string };
}

// Pastikan folder upload ada saat module diload
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

@Controller('users')
@UseGuards(AuthGuard('jwt')) // pakai AuthGuard langsung — tidak butuh import AuthModule
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * PATCH /api/users/update-profile
   *
   * Update nama dan/atau foto profil user yang sedang login.
   * Foto dikirim sebagai multipart/form-data dengan field name "photo".
   *
   * Request (multipart/form-data):
   *   - photo: File (opsional) — JPEG/PNG/WebP, maks 5MB
   *   - name: string (opsional)
   *
   * Response 200:
   * {
   *   "id": 1,
   *   "email": "farah@...",
   *   "name": "Farah Aulia",
   *   "photoUrl": "http://192.168.100.112:3000/uploads/photo-1234567890.jpg",
   *   "role": "USER",
   *   "isMitra": false
   * }
   */
  @Patch('update-profile')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          // Nama file unik: photo-<timestamp>-<random>.<ext>
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `photo-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        // Hanya izinkan gambar
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
          return cb(
            new BadRequestException(
              'Format file tidak didukung. Gunakan JPG, PNG, atau WebP.',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Bangun URL publik foto jika ada file yang diupload
    // Pada production, ganti dengan URL CDN/S3
    const photoUrl = file
      ? `${process.env.BASE_URL ?? 'http://192.168.100.112:3000'}/uploads/${file.filename}`
      : undefined;

    const updated = await this.usersService.updateProfile(req.user.id, {
      name: dto.name,
      photoUrl,
    });

    // Kembalikan format yang sama dengan GET /auth/me
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      photoUrl: updated.photoUrl,
      role: updated.role,
      isMitra: updated.isMitra,
    };
  }
}
