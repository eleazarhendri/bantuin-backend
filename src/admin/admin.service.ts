import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MitraRegistration, User } from '@prisma/client';
import { RegistrationStatus } from '../mitra/mitra.service';

// Tipe gabungan untuk response yang menyertakan data user
export type RegistrationWithUser = MitraRegistration & { user: User };

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Lihat Semua Pendaftaran ────────────────────────────────────────────────

  /**
   * Ambil semua pendaftaran mitra berdasarkan status.
   * Default: hanya tampilkan yang PENDING.
   *
   * Menyertakan data user (nama, email) untuk kemudahan review admin.
   */
  async getAllRegistrations(
    status: string = RegistrationStatus.PENDING,
  ): Promise<RegistrationWithUser[]> {
    return this.prisma.mitraRegistration.findMany({
      where: { status },
      include: {
        user: true, // join ke tabel users
      },
      orderBy: { createdAt: 'asc' }, // yang paling lama menunggu tampil duluan
    });
  }

  /**
   * Ambil detail satu pendaftaran berdasarkan ID.
   */
  async getRegistrationById(id: number): Promise<RegistrationWithUser> {
    const registration = await this.prisma.mitraRegistration.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!registration) {
      throw new NotFoundException(`Pendaftaran dengan ID ${id} tidak ditemukan`);
    }

    return registration;
  }

  // ── Approve Pendaftaran ────────────────────────────────────────────────────

  /**
   * Admin menyetujui pendaftaran mitra.
   *
   * Efek samping (dalam satu transaksi atomik):
   * 1. Status MitraRegistration → APPROVED
   * 2. User.isMitra → true
   * 3. User.role → "MITRA"
   *
   * Menggunakan Prisma transaction agar kedua update berhasil atau
   * keduanya gagal — tidak ada state setengah-setengah.
   */
  async approveRegistration(
    registrationId: number,
    adminId: number,
  ): Promise<{ registration: MitraRegistration; user: User }> {
    // ── Validasi: pendaftaran harus ada dan masih PENDING ─────────────────
    const registration = await this.prisma.mitraRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new NotFoundException(
        `Pendaftaran dengan ID ${registrationId} tidak ditemukan`,
      );
    }

    if (registration.status !== RegistrationStatus.PENDING) {
      throw new BadRequestException(
        `Pendaftaran ini sudah diproses dengan status: ${registration.status}`,
      );
    }

    // ── Jalankan dalam satu transaksi ─────────────────────────────────────
    const [updatedRegistration, updatedUser] = await this.prisma.$transaction([
      // 1. Update status pendaftaran
      this.prisma.mitraRegistration.update({
        where: { id: registrationId },
        data: {
          status: RegistrationStatus.APPROVED,
          reviewedBy: adminId,
        },
      }),

      // 2. Update user: isMitra = true, role = "MITRA"
      this.prisma.user.update({
        where: { id: registration.userId },
        data: {
          isMitra: true,
          role: 'MITRA',
        },
      }),
    ]);

    // 3. Buat atau update MitraProfile dari data registrasi
    //    Gunakan upsert agar idempotent (aman jika dipanggil ulang)
    await this.prisma.mitraProfile.upsert({
      where: { userId: registration.userId },
      create: {
        userId: registration.userId,
        category: registration.serviceCategory,
        description: registration.experience,
        bio: registration.experience.substring(0, 200),
        price: 0,          // mitra set sendiri nanti
        campus: '',        // mitra lengkapi nanti
        domicile: '',      // mitra lengkapi nanti
        phoneNumber: '',   // mitra lengkapi nanti
        isVerified: true,  // sudah diverifikasi admin
      },
      update: {
        // Jika sudah ada profil, update kategori & verifikasi saja
        category: registration.serviceCategory,
        isVerified: true,
      },
    });

    this.logger.log(
      `[ADMIN] APPROVE: registrationId=${registrationId} | userId=${registration.userId} | adminId=${adminId} | MitraProfile created`,
    );

    return {
      registration: updatedRegistration,
      user: updatedUser,
    };
  }

  // ── Reject Pendaftaran ─────────────────────────────────────────────────────

  /**
   * Admin menolak pendaftaran mitra.
   *
   * Status MitraRegistration → REJECTED.
   * User.isMitra tetap false — user bisa mendaftar ulang setelah memperbaiki data.
   */
  async rejectRegistration(
    registrationId: number,
    adminId: number,
    adminNote?: string,
  ): Promise<MitraRegistration> {
    // ── Validasi ──────────────────────────────────────────────────────────
    const registration = await this.prisma.mitraRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new NotFoundException(
        `Pendaftaran dengan ID ${registrationId} tidak ditemukan`,
      );
    }

    if (registration.status !== RegistrationStatus.PENDING) {
      throw new BadRequestException(
        `Pendaftaran ini sudah diproses dengan status: ${registration.status}`,
      );
    }

    // ── Update status ─────────────────────────────────────────────────────
    const updated = await this.prisma.mitraRegistration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.REJECTED,
        reviewedBy: adminId,
        adminNote: adminNote ?? null,
      },
    });

    this.logger.log(
      `[ADMIN] REJECT: registrationId=${registrationId} | userId=${registration.userId} | adminId=${adminId} | note="${adminNote}"`,
    );

    return updated;
  }

  // ── Statistik ──────────────────────────────────────────────────────────────

  /**
   * Ringkasan jumlah pendaftaran per status.
   * Berguna untuk dashboard admin.
   */
  async getRegistrationStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    const [pending, approved, rejected] = await Promise.all([
      this.prisma.mitraRegistration.count({
        where: { status: RegistrationStatus.PENDING },
      }),
      this.prisma.mitraRegistration.count({
        where: { status: RegistrationStatus.APPROVED },
      }),
      this.prisma.mitraRegistration.count({
        where: { status: RegistrationStatus.REJECTED },
      }),
    ]);

    return {
      pending,
      approved,
      rejected,
      total: pending + approved + rejected,
    };
  }
}
