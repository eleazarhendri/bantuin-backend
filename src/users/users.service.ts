import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cari user berdasarkan email.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Cari user berdasarkan Google Subject ID.
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { googleId },
    });
  }

  /**
   * Cari user berdasarkan ID internal (Int).
   * REVISI: Mengubah tipe parameter id dari string menjadi number.
   */
  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      // Di sini cukup pakai id saja karena tipenya sudah number
      where: { id: id }, 
    });
  }

  /**
   * Buat user baru dengan email/password.
   */
  async createWithEmail(data: {
    email: string;
    hashedPassword: string;
    name: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.hashedPassword,
        name: data.name,
      },
    });
  }

  /**
   * Buat user baru dari Google OAuth.
   * Menyimpan name dan photoUrl dari profil Google.
   */
  async createWithGoogle(data: {
    email: string;
    name: string;
    googleId: string;
    photoUrl?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        googleId: data.googleId,
        photoUrl: data.photoUrl ?? null,
      },
    });
  }

  /**
   * Hubungkan akun Google ke user yang sudah ada.
   * Sekaligus update name dan photoUrl jika belum ada.
   */
  async linkGoogleId(
    userId: number,
    googleId: string,
    googleName?: string,
    googlePhotoUrl?: string,
  ): Promise<User> {
    const user = await this.findById(userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        googleId,
        // Update name hanya jika belum ada (akun email mungkin sudah punya nama)
        name: user?.name ?? googleName ?? null,
        // Update photoUrl hanya jika belum ada
        photoUrl: user?.photoUrl ?? googlePhotoUrl ?? null,
      },
    });
  }

  /**
   * Update profil user — name dan/atau photoUrl.
   * Dipanggil oleh PATCH /users/update-profile.
   */
  async updateProfile(
    userId: number,
    data: { name?: string; photoUrl?: string },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
      },
    });
  }

  /**
   * Update status isMitra dan role user.
   * Dipanggil oleh AdminService saat approve pendaftaran.
   * (Sudah dihandle via Prisma transaction di AdminService,
   *  method ini tersedia sebagai alternatif jika dibutuhkan.)
   */
  async setMitraStatus(
    userId: number,
    isMitra: boolean,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isMitra,
        role: isMitra ? 'MITRA' : 'USER',
      },
    });
  }
}