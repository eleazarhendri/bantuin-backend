/**
 * Seeder Mitra Test — untuk PostgreSQL (Neon)
 * Membuat 2 akun mitra aktif + data pesanan selesai + transaksi wallet
 * sehingga grafik pendapatan langsung terisi saat login.
 *
 * Jalankan: npm run prisma:seed-mitra
 */
import { PrismaClient } from '@prisma/client';
import bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// ── Helper: tanggal N hari lalu ────────────────────────────────────────────
function daysAgo(n: number, offsetHours = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(offsetHours, 0, 0, 0);
  return d;
}

// ── Helper: angka acak dalam range ────────────────────────────────────────
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Data pesanan dummy per mitra ───────────────────────────────────────────
// Setiap entry = 1 pesanan selesai
// daysAgo: berapa hari lalu pesanan selesai
// serviceFee: pendapatan kotor mitra (sebelum komisi 8%)
const AZRIEL_ORDERS = [
  // Minggu ini (0-6 hari lalu)
  { daysAgo: 0, category: 'jastip',   name: 'Jasa Titip',       desc: 'Jastip nasi goreng + es teh dari Warmindo Pak Budi',   serviceFee: 15000 },
  { daysAgo: 1, category: 'beberes',  name: 'Beberes Kos',      desc: 'Beberes kamar kos 3x4m, sapu + pel + rapikan meja',    serviceFee: 35000 },
  { daysAgo: 1, category: 'jastip',   name: 'Jasa Titip',       desc: 'Jastip makan siang 3 porsi dari kantin FEB UGM',       serviceFee: 12000 },
  { daysAgo: 2, category: 'pindahan', name: 'Bantuan Pindahan',  desc: 'Bantu pindah kos dari Pogung ke Seturan',              serviceFee: 80000 },
  { daysAgo: 3, category: 'jastip',   name: 'Jasa Titip',       desc: 'Jastip print + jilid laporan PKL 50 halaman',          serviceFee: 10000 },
  { daysAgo: 4, category: 'beberes',  name: 'Beberes Kos',      desc: 'Beberes kos + cuci piring + buang sampah',             serviceFee: 30000 },
  { daysAgo: 5, category: 'jastip',   name: 'Jasa Titip',       desc: 'Jastip beli obat di apotek Kimia Farma Kaliurang',     serviceFee: 8000  },
  { daysAgo: 6, category: 'jastip',   name: 'Jasa Titip',       desc: 'Jastip beli snack + minuman untuk rapat organisasi',   serviceFee: 18000 },
  // Minggu lalu (7-13 hari lalu)
  { daysAgo: 7,  category: 'beberes',  name: 'Beberes Kos',     desc: 'Beberes kos + ganti sprei + lap jendela',              serviceFee: 40000 },
  { daysAgo: 8,  category: 'jastip',   name: 'Jasa Titip',      desc: 'Jastip beli buku di Gramedia Amplaz',                  serviceFee: 15000 },
  { daysAgo: 9,  category: 'pindahan', name: 'Bantuan Pindahan', desc: 'Bantu angkut barang dari kos ke rumah orang tua',      serviceFee: 100000},
  { daysAgo: 10, category: 'jastip',   name: 'Jasa Titip',      desc: 'Jastip makan malam + dessert dari Malioboro Mall',     serviceFee: 20000 },
  { daysAgo: 11, category: 'beberes',  name: 'Beberes Kos',     desc: 'Beberes kos 2 kamar sekaligus',                        serviceFee: 60000 },
  { daysAgo: 12, category: 'jastip',   name: 'Jasa Titip',      desc: 'Jastip beli token listrik + pulsa',                    serviceFee: 5000  },
  { daysAgo: 13, category: 'jastip',   name: 'Jasa Titip',      desc: 'Jastip beli kado ulang tahun teman',                   serviceFee: 25000 },
  // 2 minggu lalu (14-20 hari lalu)
  { daysAgo: 14, category: 'beberes',  name: 'Beberes Kos',     desc: 'Beberes kos + cuci kamar mandi',                       serviceFee: 45000 },
  { daysAgo: 15, category: 'jastip',   name: 'Jasa Titip',      desc: 'Jastip beli alat tulis + kertas A4 di Toko Buku',      serviceFee: 10000 },
  { daysAgo: 16, category: 'pindahan', name: 'Bantuan Pindahan', desc: 'Bantu pindah kos area Condongcatur',                   serviceFee: 75000 },
  { daysAgo: 17, category: 'jastip',   name: 'Jasa Titip',      desc: 'Jastip beli makan siang + kopi untuk 2 orang',         serviceFee: 12000 },
  { daysAgo: 18, category: 'beberes',  name: 'Beberes Kos',     desc: 'Beberes kos + rapikan lemari + sapu',                  serviceFee: 30000 },
  { daysAgo: 19, category: 'jastip',   name: 'Jasa Titip',      desc: 'Jastip beli obat warung + vitamin C',                  serviceFee: 7000  },
  { daysAgo: 20, category: 'jastip',   name: 'Jasa Titip',      desc: 'Jastip beli sarapan pagi 4 porsi',                     serviceFee: 16000 },
  // 3 minggu lalu (21-30 hari lalu)
  { daysAgo: 21, category: 'beberes',  name: 'Beberes Kos',     desc: 'Beberes kos + cuci piring + buang sampah',             serviceFee: 35000 },
  { daysAgo: 22, category: 'jastip',   name: 'Jasa Titip',      desc: 'Jastip beli bahan masak dari pasar Kranggan',          serviceFee: 20000 },
  { daysAgo: 24, category: 'pindahan', name: 'Bantuan Pindahan', desc: 'Bantu pindah kos area Sleman ke Bantul',               serviceFee: 120000},
  { daysAgo: 25, category: 'jastip',   name: 'Jasa Titip',      desc: 'Jastip beli makan siang + minuman',                    serviceFee: 10000 },
  { daysAgo: 27, category: 'beberes',  name: 'Beberes Kos',     desc: 'Beberes kos + lap lantai + rapikan dapur',             serviceFee: 40000 },
  { daysAgo: 29, category: 'jastip',   name: 'Jasa Titip',      desc: 'Jastip beli snack + minuman untuk nonton bareng',      serviceFee: 22000 },
  { daysAgo: 30, category: 'jastip',   name: 'Jasa Titip',      desc: 'Jastip beli sarapan + kopi pagi',                      serviceFee: 13000 },
];

const DEMO_ORDERS = [
  // Minggu ini
  { daysAgo: 0, category: 'les',   name: 'Les & Tutor',  desc: 'Les Kalkulus 2 jam, materi integral',                    serviceFee: 50000 },
  { daysAgo: 1, category: 'jastip', name: 'Jasa Titip',  desc: 'Jastip beli makan siang dari kantin UPN',               serviceFee: 10000 },
  { daysAgo: 2, category: 'joki',  name: 'Joki Tugas',   desc: 'Bantu laporan praktikum Kimia Dasar 10 halaman',         serviceFee: 75000 },
  { daysAgo: 3, category: 'les',   name: 'Les & Tutor',  desc: 'Les Statistika 1.5 jam, materi regresi linear',          serviceFee: 40000 },
  { daysAgo: 4, category: 'jastip', name: 'Jasa Titip',  desc: 'Jastip print + fotokopi modul kuliah',                   serviceFee: 8000  },
  { daysAgo: 5, category: 'joki',  name: 'Joki Tugas',   desc: 'Bantu resume jurnal internasional 5 halaman',            serviceFee: 60000 },
  { daysAgo: 6, category: 'les',   name: 'Les & Tutor',  desc: 'Les Bahasa Inggris 2 jam, persiapan TOEFL',              serviceFee: 55000 },
  // Minggu lalu
  { daysAgo: 7,  category: 'joki',  name: 'Joki Tugas',  desc: 'Bantu makalah Pancasila 15 halaman',                     serviceFee: 90000 },
  { daysAgo: 8,  category: 'les',   name: 'Les & Tutor', desc: 'Les Pemrograman Python 2 jam',                           serviceFee: 60000 },
  { daysAgo: 9,  category: 'jastip', name: 'Jasa Titip', desc: 'Jastip beli buku referensi di toko buku',                serviceFee: 12000 },
  { daysAgo: 10, category: 'joki',  name: 'Joki Tugas',  desc: 'Bantu presentasi PPT seminar proposal 20 slide',         serviceFee: 80000 },
  { daysAgo: 11, category: 'les',   name: 'Les & Tutor', desc: 'Les Akuntansi Dasar 1.5 jam',                            serviceFee: 45000 },
  { daysAgo: 12, category: 'jastip', name: 'Jasa Titip', desc: 'Jastip beli alat tulis + kertas HVS',                    serviceFee: 9000  },
  { daysAgo: 13, category: 'joki',  name: 'Joki Tugas',  desc: 'Bantu laporan KKN bab 1-3',                              serviceFee: 150000},
  // 2 minggu lalu
  { daysAgo: 14, category: 'les',   name: 'Les & Tutor', desc: 'Les Matematika Diskrit 2 jam',                           serviceFee: 50000 },
  { daysAgo: 15, category: 'joki',  name: 'Joki Tugas',  desc: 'Bantu essay Bahasa Indonesia 8 halaman',                 serviceFee: 70000 },
  { daysAgo: 16, category: 'jastip', name: 'Jasa Titip', desc: 'Jastip beli makan siang + minuman',                      serviceFee: 11000 },
  { daysAgo: 17, category: 'les',   name: 'Les & Tutor', desc: 'Les Fisika Dasar 2 jam, materi gelombang',               serviceFee: 55000 },
  { daysAgo: 18, category: 'joki',  name: 'Joki Tugas',  desc: 'Bantu tugas analisis SWOT perusahaan',                   serviceFee: 65000 },
  { daysAgo: 19, category: 'les',   name: 'Les & Tutor', desc: 'Les Kimia Organik 1.5 jam',                              serviceFee: 45000 },
  { daysAgo: 20, category: 'jastip', name: 'Jasa Titip', desc: 'Jastip beli snack + kopi untuk begadang',                serviceFee: 15000 },
  // 3 minggu lalu
  { daysAgo: 21, category: 'joki',  name: 'Joki Tugas',  desc: 'Bantu laporan praktikum Biologi 12 halaman',             serviceFee: 85000 },
  { daysAgo: 22, category: 'les',   name: 'Les & Tutor', desc: 'Les Kalkulus lanjutan 2 jam',                            serviceFee: 50000 },
  { daysAgo: 24, category: 'joki',  name: 'Joki Tugas',  desc: 'Bantu proposal penelitian bab 1-2',                      serviceFee: 120000},
  { daysAgo: 25, category: 'les',   name: 'Les & Tutor', desc: 'Les Pemrograman Web 2 jam, HTML+CSS+JS',                 serviceFee: 60000 },
  { daysAgo: 27, category: 'jastip', name: 'Jasa Titip', desc: 'Jastip beli bahan presentasi + print',                   serviceFee: 13000 },
  { daysAgo: 28, category: 'joki',  name: 'Joki Tugas',  desc: 'Bantu tugas akhir bab 4 analisis data',                  serviceFee: 200000},
  { daysAgo: 30, category: 'les',   name: 'Les & Tutor', desc: 'Les Statistika Bisnis 2 jam',                            serviceFee: 55000 },
];

// ── User dummy untuk jadi pembeli ─────────────────────────────────────────
const DUMMY_BUYERS = [
  { email: 'farah@student.uny.ac.id',  name: 'Farah Aulia'    },
  { email: 'budi@student.ugm.ac.id',   name: 'Budi Santoso'   },
  { email: 'dinda@student.uii.ac.id',  name: 'Dinda Sari'     },
  { email: 'rizky@student.upnyk.ac.id', name: 'Rizky Ramadhan' },
];

const PLATFORM_COMMISSION = 0.08;

async function main() {
  console.log('[SEED] Memulai seed mitra + data pendapatan...\n');

  // ── Buat user dummy sebagai pembeli ───────────────────────────────────────
  const buyers: { id: number; name: string }[] = [];
  for (const b of DUMMY_BUYERS) {
    let user = await prisma.user.findUnique({ where: { email: b.email } });
    if (!user) {
      const hashed = await bcrypt.hash('User@2025!', 10);
      user = await prisma.user.create({
        data: { email: b.email, name: b.name, password: hashed, role: 'USER' },
      });
      // Buat wallet user
      await prisma.wallet.upsert({
        where: { userId: user.id },
        create: { userId: user.id, balance: 20_000 },
        update: {},
      });
      console.log(`[SEED] User pembeli dibuat: ${b.email}`);
    } else {
      console.log(`[SEED] User pembeli sudah ada: ${b.email}`);
    }
    buyers.push({ id: user.id, name: user.name ?? b.name });
  }

  // ── Buat mitra Azriel ─────────────────────────────────────────────────────
  const azriel = await upsertMitra({
    email: 'mitra@bantuin.id',
    password: 'Mitra@Bantuin2025!',
    name: 'Azriel Pratama',
    category: 'jastip,beberes,pindahan',
    description: 'Melayani jastip makanan, minuman, dan barang di sekitar Sleman & Yogyakarta Kota. Beberes kos dan bantuan pindahan juga tersedia.',
    bio: 'Mahasiswa UGM semester 5, siap bantu keperluanmu!',
    campus: 'Universitas Gadjah Mada',
    domicile: 'Sleman',
    phoneNumber: '081234567890',
    price: 5000,
    rating: 4.8,
    totalReviews: AZRIEL_ORDERS.length,
    totalOrders: AZRIEL_ORDERS.length,
    latitude: -7.7714,
    longitude: 110.3776,
  });

  await seedOrders(azriel.id, buyers, AZRIEL_ORDERS);

  // ── Buat mitra Demo ───────────────────────────────────────────────────────
  const demo = await upsertMitra({
    email: 'demo@bantuin.id',
    password: 'Demo@Bantuin2025!',
    name: 'Demo Mitra UPN',
    category: 'jastip,les,joki',
    description: 'Akun demo untuk testing fitur mitra. Melayani jastip, les privat, dan joki tugas di area UPN Veteran Yogyakarta.',
    bio: 'Mahasiswa UPN Veteran Yogyakarta, aktif dan responsif!',
    campus: 'UPN Veteran Yogyakarta',
    domicile: 'Sleman',
    phoneNumber: '082345678901',
    price: 8000,
    rating: 4.6,
    totalReviews: DEMO_ORDERS.length,
    totalOrders: DEMO_ORDERS.length,
    latitude: -7.7527,
    longitude: 110.3878,
  });

  await seedOrders(demo.id, buyers, DEMO_ORDERS);

  // ── Ringkasan ─────────────────────────────────────────────────────────────
  const azrielWallet = await prisma.wallet.findUnique({ where: { userId: azriel.id } });
  const demoWallet   = await prisma.wallet.findUnique({ where: { userId: demo.id } });

  console.log('\n[SEED] ✅ Selesai! Ringkasan:');
  console.log('');
  console.log('  Akun Mitra:');
  console.log('  ┌─────────────────────────────────────────────────────────────┐');
  console.log('  │  Email                  Password              Nama          │');
  console.log('  ├─────────────────────────────────────────────────────────────┤');
  console.log('  │  mitra@bantuin.id       Mitra@Bantuin2025!    Azriel Pratama│');
  console.log('  │  demo@bantuin.id        Demo@Bantuin2025!     Demo Mitra UPN│');
  console.log('  └─────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log(`  Azriel : ${AZRIEL_ORDERS.length} pesanan selesai | Saldo: Rp ${Math.floor(azrielWallet?.balance ?? 0).toLocaleString('id-ID')}`);
  console.log(`  Demo   : ${DEMO_ORDERS.length} pesanan selesai | Saldo: Rp ${Math.floor(demoWallet?.balance ?? 0).toLocaleString('id-ID')}`);
  console.log('');
  console.log('  User pembeli (password: User@2025!):');
  for (const b of DUMMY_BUYERS) {
    console.log(`    - ${b.email}`);
  }
}

// ── Buat pesanan selesai + kredit wallet mitra ─────────────────────────────
async function seedOrders(
  mitraId: number,
  buyers: { id: number; name: string }[],
  orders: typeof AZRIEL_ORDERS,
) {
  // Ambil atau buat wallet mitra
  const wallet = await prisma.wallet.upsert({
    where: { userId: mitraId },
    create: { userId: mitraId, balance: 20_000 },
    update: {},
  });

  let totalEarned = 0;
  let created = 0;

  for (const o of orders) {
    const buyer = buyers[rand(0, buyers.length - 1)];
    const itemBudget = o.category === 'jastip' ? rand(10, 50) * 1000 : 0;
    const platformFee = (itemBudget + o.serviceFee) * PLATFORM_COMMISSION;
    const totalAmount = itemBudget + o.serviceFee + platformFee;
    const mitraEarning = o.serviceFee * (1 - PLATFORM_COMMISSION);

    const orderDate = daysAgo(o.daysAgo, rand(8, 20));
    const acceptedAt = new Date(orderDate.getTime() + rand(2, 10) * 60 * 1000);
    const completedAt = new Date(orderDate.getTime() + rand(30, 180) * 60 * 1000);

    // Cek apakah pesanan dengan deskripsi + mitraId + tanggal sudah ada
    // (idempotent — aman dijalankan ulang)
    const existing = await prisma.order.findFirst({
      where: {
        mitraId,
        itemDescription: o.desc,
        createdAt: {
          gte: new Date(orderDate.getTime() - 60_000),
          lte: new Date(orderDate.getTime() + 60_000),
        },
      },
    });
    if (existing) continue;

    const order = await prisma.order.create({
      data: {
        userId: buyer.id,
        mitraId,
        categoryId: o.category,
        categoryName: o.name,
        itemDescription: o.desc,
        itemBudget,
        serviceFee: o.serviceFee,
        platformFee,
        totalAmount,
        status: 'done',
        acceptedAt,
        completedAt,
        isReviewed: Math.random() > 0.4,
        createdAt: orderDate,
        updatedAt: completedAt,
      },
    });

    // Kredit wallet mitra
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: mitraEarning } },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: mitraEarning,
          type: 'CREDIT',
          description: `Pendapatan dari pesanan #${order.id} - ${o.name}`,
          orderId: order.id,
          createdAt: completedAt,
        },
      }),
    ]);

    totalEarned += mitraEarning;
    created++;
  }

  console.log(`[SEED] Mitra id=${mitraId}: ${created} pesanan baru dibuat | +Rp ${Math.floor(totalEarned).toLocaleString('id-ID')}`);
}

// ── Upsert mitra user + profile ────────────────────────────────────────────
async function upsertMitra(data: {
  email: string;
  password: string;
  name: string;
  category: string;
  description: string;
  bio: string;
  campus: string;
  domicile: string;
  phoneNumber: string;
  price: number;
  rating: number;
  totalReviews: number;
  totalOrders: number;
  latitude: number;
  longitude: number;
}): Promise<{ id: number }> {
  let user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user) {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: 'MITRA',
        isMitra: true,
      },
    });
    console.log(`[SEED] Mitra dibuat: ${data.email} (id: ${user.id})`);
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { isMitra: true, role: 'MITRA' },
    });
    console.log(`[SEED] Mitra sudah ada: ${data.email} (id: ${user.id})`);
  }

  await prisma.mitraProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      category: data.category,
      description: data.description,
      bio: data.bio,
      campus: data.campus,
      domicile: data.domicile,
      phoneNumber: data.phoneNumber,
      price: data.price,
      isVerified: true,
      isOnline: true,
      rating: data.rating,
      totalReviews: data.totalReviews,
      totalOrders: data.totalOrders,
      latitude: data.latitude,
      longitude: data.longitude,
    },
    update: {
      isVerified: true,
      isOnline: true,
      rating: data.rating,
      totalReviews: data.totalReviews,
      totalOrders: data.totalOrders,
      latitude: data.latitude,
      longitude: data.longitude,
    },
  });

  return { id: user.id };
}

main()
  .catch((e) => {
    console.error('[SEED] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
