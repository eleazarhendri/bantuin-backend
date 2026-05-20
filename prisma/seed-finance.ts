/**
 * Seeder Data Keuangan Dummy
 * Membuat beberapa user, mitra, pesanan selesai, dan transaksi wallet.
 *
 * Jalankan: npm run prisma:seed-finance
 */
import { PrismaClient } from '@prisma/client';
import bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Membuat data keuangan dummy...\n');

  // ── 1. Buat beberapa user dummy ────────────────────────────────────────────
  const userEmails = [
    { email: 'farah@student.uny.ac.id', name: 'Farah Aulia' },
    { email: 'budi@student.ugm.ac.id', name: 'Budi Santoso' },
    { email: 'dinda@student.uii.ac.id', name: 'Dinda Sari' },
  ];

  const users: { id: number; name: string }[] = [];
  for (const u of userEmails) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      users.push({ id: existing.id, name: existing.name ?? u.name });
      console.log(`[SEED] User sudah ada: ${u.email}`);
    } else {
      const hashed = await bcrypt.hash('User@2025!', 10);
      const created = await prisma.user.create({
        data: { email: u.email, name: u.name, password: hashed, role: 'USER' },
      });
      users.push({ id: created.id, name: created.name ?? u.name });
      console.log(`[SEED] User dibuat: ${u.email} (id: ${created.id})`);
    }
  }

  // ── 2. Buat beberapa mitra dummy ───────────────────────────────────────────
  const mitraData = [
    {
      email: 'azriel@student.ugm.ac.id', name: 'Azriel Pratama',
      category: 'jastip,beberes', campus: 'UGM', domicile: 'Sleman',
      description: 'Jastip dan beberes kos area Sleman & Jogja Kota',
    },
    {
      email: 'reza@student.uny.ac.id', name: 'Reza Firmansyah',
      category: 'servis,desain', campus: 'UNY', domicile: 'Bantul',
      description: 'Servis gadget dan desain grafis profesional',
    },
    {
      email: 'siti@student.uii.ac.id', name: 'Siti Nurhaliza',
      category: 'les,joki', campus: 'UII', domicile: 'Sleman',
      description: 'Les privat dan tutor sebaya semua mata kuliah',
    },
  ];

  const mitras: { id: number; name: string }[] = [];
  for (const m of mitraData) {
    let user = await prisma.user.findUnique({ where: { email: m.email } });
    if (!user) {
      const hashed = await bcrypt.hash('Mitra@2025!', 10);
      user = await prisma.user.create({
        data: { email: m.email, name: m.name, password: hashed, role: 'MITRA', isMitra: true },
      });
      console.log(`[SEED] Mitra user dibuat: ${m.email} (id: ${user.id})`);
    } else if (!user.isMitra) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isMitra: true, role: 'MITRA' },
      });
    }

    await prisma.mitraProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id, category: m.category, description: m.description,
        bio: m.description.substring(0, 100), campus: m.campus, domicile: m.domicile,
        price: 10000, isVerified: true, isOnline: true,
        rating: 4.5 + Math.random() * 0.5,
        totalReviews: Math.floor(Math.random() * 20) + 5,
        totalOrders: Math.floor(Math.random() * 30) + 10,
      },
      update: { isVerified: true, isOnline: true },
    });

    mitras.push({ id: user.id, name: user.name ?? m.name });
    console.log(`[SEED] Mitra profile upsert: ${m.email}`);
  }

  // ── 3. Buat pesanan selesai + transaksi wallet ─────────────────────────────
  const categories = [
    { id: 'jastip', name: 'Jasa Titip' },
    { id: 'beberes', name: 'Beberes Kos' },
    { id: 'servis', name: 'Servis Gadget' },
    { id: 'les', name: 'Les & Tutor' },
  ];

  const descriptions = [
    'Nasi goreng spesial + es teh manis',
    'Beberes kamar kos 3x4m',
    'Servis laptop lemot + install ulang Windows',
    'Les Kalkulus 2 jam',
    'Jastip makan siang dari kantin',
    'Desain poster seminar A3',
  ];

  let orderCount = 0;
  const now = new Date();

  for (const mitra of mitras) {
    // Buat wallet untuk mitra
    const wallet = await prisma.wallet.upsert({
      where: { userId: mitra.id },
      create: { userId: mitra.id, balance: 0 },
      update: {},
    });

    // Buat 5-8 pesanan selesai per mitra
    const numOrders = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numOrders; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const desc = descriptions[Math.floor(Math.random() * descriptions.length)];
      const serviceFee = (3 + Math.floor(Math.random() * 8)) * 5000; // 15k-55k
      const itemBudget = cat.id === 'jastip' ? (2 + Math.floor(Math.random() * 5)) * 10000 : 0;
      const platformFee = (itemBudget + serviceFee) * 0.08;
      const totalAmount = itemBudget + serviceFee + platformFee;
      const mitraEarning = serviceFee * 0.92;

      // Tanggal acak dalam 30 hari terakhir
      const daysAgo = Math.floor(Math.random() * 30);
      const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const completedDate = new Date(orderDate.getTime() + 2 * 60 * 60 * 1000);

      const order = await prisma.order.create({
        data: {
          userId: user.id, mitraId: mitra.id,
          categoryId: cat.id, categoryName: cat.name,
          itemDescription: desc,
          itemBudget, serviceFee, platformFee, totalAmount,
          status: 'done',
          acceptedAt: new Date(orderDate.getTime() + 5 * 60 * 1000),
          completedAt: completedDate,
          isReviewed: Math.random() > 0.5,
          createdAt: orderDate,
        },
      });

      // Kredit wallet mitra
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: mitraEarning } },
      });

      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: mitraEarning,
          type: 'CREDIT',
          description: `Pendapatan dari pesanan #${order.id} - ${cat.name}`,
          orderId: order.id,
          createdAt: completedDate,
        },
      });

      orderCount++;
    }

    // Tampilkan saldo akhir
    const finalWallet = await prisma.wallet.findUnique({ where: { userId: mitra.id } });
    console.log(`[SEED] Mitra ${mitra.name}: ${numOrders} pesanan, saldo = Rp ${finalWallet?.balance.toFixed(0)}`);
  }

  console.log(`\n[SEED] Selesai! Total pesanan dibuat: ${orderCount}`);
  console.log('\n[SEED] Akun dummy yang tersedia:');
  console.log('  Users: farah@student.uny.ac.id, budi@student.ugm.ac.id, dinda@student.uii.ac.id');
  console.log('  Password user: User@2025!');
  console.log('  Mitras: azriel@student.ugm.ac.id, reza@student.uny.ac.id, siti@student.uii.ac.id');
  console.log('  Password mitra: Mitra@2025!');
}

main()
  .catch((e) => { console.error('[SEED] Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
