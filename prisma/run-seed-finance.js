const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Membuat data keuangan dummy...\n');

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = [];
  const userList = [
    { email: 'farah@student.uny.ac.id', name: 'Farah Aulia' },
    { email: 'budi@student.ugm.ac.id', name: 'Budi Santoso' },
    { email: 'dinda@student.uii.ac.id', name: 'Dinda Sari' },
  ];

  for (const u of userList) {
    let user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      const hashed = await bcrypt.hash('User@2025!', 10);
      user = await prisma.user.create({
        data: { email: u.email, name: u.name, password: hashed, role: 'USER' },
      });
      console.log(`[SEED] User dibuat: ${u.email} (id: ${user.id})`);
    } else {
      console.log(`[SEED] User sudah ada: ${u.email}`);
    }
    users.push({ id: user.id, name: user.name });
  }

  // ── Mitras ─────────────────────────────────────────────────────────────────
  const mitraList = [
    { email: 'azriel@student.ugm.ac.id', name: 'Azriel Pratama', category: 'jastip,beberes', campus: 'UGM', domicile: 'Sleman' },
    { email: 'reza@student.uny.ac.id', name: 'Reza Firmansyah', category: 'servis,desain', campus: 'UNY', domicile: 'Bantul' },
    { email: 'siti@student.uii.ac.id', name: 'Siti Nurhaliza', category: 'les,joki', campus: 'UII', domicile: 'Sleman' },
  ];

  const mitras = [];
  for (const m of mitraList) {
    let user = await prisma.user.findUnique({ where: { email: m.email } });
    if (!user) {
      const hashed = await bcrypt.hash('Mitra@2025!', 10);
      user = await prisma.user.create({
        data: { email: m.email, name: m.name, password: hashed, role: 'MITRA', isMitra: true },
      });
      console.log(`[SEED] Mitra dibuat: ${m.email} (id: ${user.id})`);
    } else if (!user.isMitra) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isMitra: true, role: 'MITRA' },
      });
      console.log(`[SEED] Mitra diupdate: ${m.email}`);
    } else {
      console.log(`[SEED] Mitra sudah ada: ${m.email}`);
    }

    await prisma.mitraProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id, category: m.category,
        description: 'Layanan profesional dan terpercaya di Yogyakarta.',
        bio: 'Siap melayani dengan sepenuh hati!',
        campus: m.campus, domicile: m.domicile,
        price: 10000, isVerified: true, isOnline: true,
        rating: 4.7, totalReviews: 8, totalOrders: 15,
      },
      update: { isVerified: true, isOnline: true },
    });

    mitras.push({ id: user.id, name: user.name });
  }

  // ── Orders + Wallet Transactions ───────────────────────────────────────────
  const cats = [
    { id: 'jastip', name: 'Jasa Titip' },
    { id: 'beberes', name: 'Beberes Kos' },
    { id: 'servis', name: 'Servis Gadget' },
    { id: 'les', name: 'Les & Tutor' },
  ];
  const descs = [
    'Nasi goreng spesial + es teh manis',
    'Beberes kamar kos 3x4m',
    'Servis laptop lemot + install ulang',
    'Les Kalkulus 2 jam',
    'Jastip makan siang dari kantin',
    'Desain poster seminar A3',
  ];

  let totalOrders = 0;
  const now = Date.now();

  for (const mitra of mitras) {
    const wallet = await prisma.wallet.upsert({
      where: { userId: mitra.id },
      create: { userId: mitra.id, balance: 0 },
      update: {},
    });

    for (let i = 0; i < 6; i++) {
      const user = users[i % users.length];
      const cat = cats[i % cats.length];
      const serviceFee = (3 + i) * 5000;
      const itemBudget = cat.id === 'jastip' ? 20000 : 0;
      const platformFee = (itemBudget + serviceFee) * 0.08;
      const totalAmount = itemBudget + serviceFee + platformFee;
      const mitraEarning = serviceFee * 0.92;
      const daysAgo = i * 3;
      const orderDate = new Date(now - daysAgo * 86400000);
      const completedDate = new Date(orderDate.getTime() + 7200000);

      const order = await prisma.order.create({
        data: {
          userId: user.id, mitraId: mitra.id,
          categoryId: cat.id, categoryName: cat.name,
          itemDescription: descs[i % descs.length],
          itemBudget, serviceFee, platformFee, totalAmount,
          status: 'done',
          acceptedAt: new Date(orderDate.getTime() + 300000),
          completedAt: completedDate,
          isReviewed: i % 2 === 0,
          createdAt: orderDate,
        },
      });

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

      totalOrders++;
    }

    const finalWallet = await prisma.wallet.findUnique({ where: { userId: mitra.id } });
    console.log(`[SEED] ${mitra.name}: 6 pesanan selesai, saldo = Rp ${Math.round(finalWallet.balance)}`);
  }

  console.log(`\n[SEED] Selesai! Total pesanan: ${totalOrders}`);
  console.log('\n[SEED] Akun dummy:');
  console.log('  Users: farah@student.uny.ac.id | budi@student.ugm.ac.id | dinda@student.uii.ac.id');
  console.log('  Password user: User@2025!');
  console.log('  Mitras: azriel@student.ugm.ac.id | reza@student.uny.ac.id | siti@student.uii.ac.id');
  console.log('  Password mitra: Mitra@2025!');
}

main()
  .catch(e => { console.error('[SEED] Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
