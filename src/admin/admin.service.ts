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
        // Salin koordinat lokasi dari registrasi jika ada
        ...(registration.latitude !== null && { latitude: registration.latitude }),
        ...(registration.longitude !== null && { longitude: registration.longitude }),
      },
      update: {
        // Jika sudah ada profil, update kategori & verifikasi saja
        category: registration.serviceCategory,
        isVerified: true,
        // Update koordinat jika registrasi punya data lokasi
        ...(registration.latitude !== null && { latitude: registration.latitude }),
        ...(registration.longitude !== null && { longitude: registration.longitude }),
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

  // ── Reset Pendaftaran ke PENDING (Re-review) ──────────────────────────────

  /**
   * Admin mereset status pendaftaran mitra yang sudah APPROVED/REJECTED
   * kembali ke PENDING agar bisa di-review ulang.
   *
   * Berguna saat admin ingin memeriksa ulang dokumen mitra yang sudah aktif.
   * Jika status sebelumnya APPROVED, mitra tetap aktif (isMitra = true)
   * sampai admin memutuskan approve/reject lagi.
   */
  async resetRegistrationForReview(
    registrationId: number,
    adminId: number,
    adminNote?: string,
  ): Promise<MitraRegistration> {
    const registration = await this.prisma.mitraRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new NotFoundException(
        `Pendaftaran dengan ID ${registrationId} tidak ditemukan`,
      );
    }

    if (registration.status === RegistrationStatus.PENDING) {
      throw new BadRequestException(
        'Pendaftaran ini sudah berstatus PENDING — tidak perlu direset.',
      );
    }

    const updated = await this.prisma.mitraRegistration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.PENDING,
        reviewedBy: adminId,
        adminNote: adminNote ?? 'Dokumen diminta untuk ditinjau ulang oleh admin.',
      },
    });

    this.logger.log(
      `[ADMIN] RESET-TO-PENDING: registrationId=${registrationId} | userId=${registration.userId} | adminId=${adminId}`,
    );

    return updated;
  }

  // ── Statistik ──────────────────────────────────────────────────────────────

  async getRegistrationStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    const [pending, approved, rejected] = await Promise.all([
      this.prisma.mitraRegistration.count({ where: { status: RegistrationStatus.PENDING } }),
      this.prisma.mitraRegistration.count({ where: { status: RegistrationStatus.APPROVED } }),
      this.prisma.mitraRegistration.count({ where: { status: RegistrationStatus.REJECTED } }),
    ]);
    return { pending, approved, rejected, total: pending + approved + rejected };
  }

  // ── Monitoring: Semua User ─────────────────────────────────────────────────

  async getAllUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: { not: 'ADMIN' } },
        select: {
          id: true, email: true, name: true, photoUrl: true,
          role: true, isMitra: true, createdAt: true,
          _count: { select: { ordersAsUser: true, ordersAsMitra: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name ?? '',
        photo_url: u.photoUrl ?? null,
        role: u.role,
        is_mitra: u.isMitra,
        created_at: u.createdAt,
        total_orders_as_user: u._count.ordersAsUser,
        total_orders_as_mitra: u._count.ordersAsMitra,
      })),
      total,
      page,
      limit,
    };
  }

  // ── Monitoring: Semua Mitra Aktif ──────────────────────────────────────────

  async getAllActiveMitras() {
    const mitras = await this.prisma.mitraProfile.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, photoUrl: true, createdAt: true } },
      },
      orderBy: { totalOrders: 'desc' },
    });

    return mitras.map((m) => ({
      id: m.userId,
      name: m.user.name ?? '',
      email: m.user.email,
      photo_url: m.user.photoUrl ?? null,
      category: m.category,
      rating: m.rating,
      total_reviews: m.totalReviews,
      total_orders: m.totalOrders,
      is_online: m.isOnline,
      is_verified: m.isVerified,
      campus: m.campus,
      domicile: m.domicile,
      joined_at: m.user.createdAt,
    }));
  }

  // ── Monitoring: Semua Pesanan ──────────────────────────────────────────────

  async getAllOrders(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          mitra: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((o) => ({
        id: o.id,
        user_name: o.user.name ?? '',
        user_email: o.user.email,
        mitra_name: o.mitra.name ?? '',
        mitra_email: o.mitra.email,
        category_name: o.categoryName,
        status: o.status,
        total_amount: o.totalAmount,
        created_at: o.createdAt,
        completed_at: o.completedAt ?? null,
      })),
      total,
      page,
      limit,
    };
  }

  // ── Monitoring: Dashboard Overview ────────────────────────────────────────

  async getDashboardOverview() {
    const [
      totalUsers, totalMitras, totalOrders,
      pendingOrders, doneOrders, totalRevenue,
      recentOrders,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.user.count({ where: { isMitra: true } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'pending' } }),
      this.prisma.order.count({ where: { status: 'done' } }),
      this.prisma.order.aggregate({
        where: { status: 'done' },
        _sum: { platformFee: true },
      }),
      this.prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } },
          mitra: { select: { name: true } },
        },
      }),
    ]);

    return {
      total_users: totalUsers,
      total_mitras: totalMitras,
      total_orders: totalOrders,
      pending_orders: pendingOrders,
      done_orders: doneOrders,
      total_platform_revenue: totalRevenue._sum.platformFee ?? 0,
      recent_orders: recentOrders.map((o) => ({
        id: o.id,
        user_name: o.user.name ?? '',
        mitra_name: o.mitra.name ?? '',
        category: o.categoryName,
        status: o.status,
        amount: o.totalAmount,
        created_at: o.createdAt,
      })),
    };
  }
}
