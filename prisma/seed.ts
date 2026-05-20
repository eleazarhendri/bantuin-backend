/**
 * Prisma Seeder — Bantuin Backend
 *
 * Membuat akun admin bawaan jika belum ada.
 *
 * Jalankan dengan:
 *   npx ts-node prisma/seed.ts
 * atau tambahkan ke package.json:
 *   "prisma": { "seed": "ts-node prisma/seed.ts" }
 * lalu jalankan:
 *   npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@bantuin.id';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@Bantuin2025!';
  const ADMIN_NAME = 'Admin Bantuin';

  // Cek apakah admin sudah ada
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    console.log(`[SEED] Admin sudah ada: ${ADMIN_EMAIL} (id: ${existing.id})`);
    // Pastikan role-nya ADMIN
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'ADMIN' },
      });
      console.log(`[SEED] Role diupdate ke ADMIN untuk: ${ADMIN_EMAIL}`);
    }
    return;
  }

  // Hash password admin
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
      role: 'ADMIN',
      isMitra: false,
    },
  });

  console.log(`[SEED] Admin berhasil dibuat:`);
  console.log(`  Email   : ${admin.email}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  ID      : ${admin.id}`);
  console.log(`  Role    : ${admin.role}`);
  console.log('');
  console.log('[SEED] PENTING: Ganti password admin setelah login pertama!');
}

main()
  .catch((e) => {
    console.error('[SEED] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
