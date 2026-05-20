"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('[SEED] Menambahkan data jasa mitra...\n');
    const azriel = await prisma.user.findUnique({ where: { email: 'mitra@bantuin.id' } });
    if (!azriel) {
        console.error('[SEED] Azriel tidak ditemukan!');
        process.exit(1);
    }
    await upsertServices(azriel.id, [
        {
            categoryId: 'servis',
            title: 'Servis Laptop & PC Jogja',
            description: 'Melayani servis laptop lemot, install ulang Windows/Linux, upgrade RAM/SSD, bersih kipas, dan troubleshooting hardware. Pengalaman 3 tahun, garansi pekerjaan 7 hari.',
            price: 50000,
            priceUnit: 'sesi',
        },
        {
            categoryId: 'servis',
            title: 'Servis HP & Tablet',
            description: 'Ganti baterai, ganti layar retak, servis kamera buram, dan install ulang sistem Android/iOS. Spare part original, harga transparan sebelum dikerjakan.',
            price: 35000,
            priceUnit: 'sesi',
        },
        {
            categoryId: 'beberes',
            title: 'Beberes Kos Standar',
            description: 'Sapu, pel lantai, lap debu, rapikan meja & lemari, buang sampah. Cocok untuk kamar kos ukuran 3x4m. Bawa peralatan sendiri, tidak perlu sediakan apa-apa.',
            price: 30000,
            priceUnit: 'sesi',
        },
        {
            categoryId: 'beberes',
            title: 'Beberes Kos Deep Clean',
            description: 'Paket lengkap: sapu, pel, cuci kamar mandi, lap jendela, bersihkan kulkas mini, rapikan semua area. Ideal untuk kos yang sudah lama tidak dibersihkan.',
            price: 75000,
            priceUnit: 'sesi',
        },
    ]);
    const demo = await prisma.user.findUnique({ where: { email: 'demo@bantuin.id' } });
    if (!demo) {
        console.error('[SEED] Demo tidak ditemukan!');
        process.exit(1);
    }
    await upsertServices(demo.id, [
        {
            categoryId: 'les',
            title: 'Les Privat Kalkulus & Statistika',
            description: 'Tutor sebaya untuk Kalkulus 1 & 2, Statistika Dasar, dan Matematika Diskrit. Metode belajar santai tapi efektif, bisa via Zoom atau tatap muka di area UPN. Nilai dijamin naik atau sesi berikutnya gratis.',
            price: 50000,
            priceUnit: 'jam',
        },
        {
            categoryId: 'les',
            title: 'Les Pemrograman (Python, Web, Data)',
            description: 'Belajar Python dari nol, web development (HTML/CSS/JS/React), atau analisis data dengan Pandas. Cocok untuk mahasiswa yang mau belajar coding dari dasar sampai bisa bikin project sendiri.',
            price: 60000,
            priceUnit: 'jam',
        },
        {
            categoryId: 'desain',
            title: 'Desain Poster & Konten Sosmed',
            description: 'Desain poster acara kampus, banner seminar, konten Instagram/TikTok, dan infografis. Menggunakan Canva Pro & Adobe Illustrator. Revisi hingga puas, file dikirim dalam format PNG/PDF/AI.',
            price: 45000,
            priceUnit: 'proyek',
        },
        {
            categoryId: 'desain',
            title: 'Desain PPT Presentasi Estetik',
            description: 'Ubah PPT biasa jadi presentasi profesional dan menarik. Cocok untuk sidang skripsi, seminar proposal, laporan PKL, atau pitching bisnis. Template custom sesuai tema, animasi rapi.',
            price: 80000,
            priceUnit: 'proyek',
        },
    ]);
    await syncCategory(azriel.id);
    await syncCategory(demo.id);
    console.log('\n[SEED] ✅ Data jasa berhasil ditambahkan:');
    console.log('  Azriel (mitra@bantuin.id): 4 jasa (2 servis + 2 beberes)');
    console.log('  Demo   (demo@bantuin.id) : 4 jasa (2 les + 2 desain)');
}
async function upsertServices(userId, services) {
    for (const s of services) {
        const existing = await prisma.mitraService.findFirst({
            where: { userId, title: s.title },
        });
        if (existing) {
            console.log(`  [SKIP] Jasa sudah ada: "${s.title}"`);
            continue;
        }
        await prisma.mitraService.create({
            data: { userId, ...s, isActive: true },
        });
        console.log(`  [ADD] "${s.title}" (${s.categoryId})`);
    }
}
async function syncCategory(userId) {
    const services = await prisma.mitraService.findMany({
        where: { userId },
        select: { categoryId: true },
    });
    const unique = [...new Set(services.map((s) => s.categoryId))];
    await prisma.mitraProfile.updateMany({
        where: { userId },
        data: { category: unique.join(',') },
    });
}
main()
    .catch((e) => { console.error('[SEED] Error:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed-services.js.map