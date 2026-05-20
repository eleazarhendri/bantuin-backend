"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    const MITRA_EMAIL = 'mitra@bantuin.id';
    const MITRA_PASSWORD = 'Mitra@Bantuin2025!';
    const MITRA_NAME = 'Azriel Pratama';
    let mitra = await prisma.user.findUnique({ where: { email: MITRA_EMAIL } });
    if (!mitra) {
        const hashedPassword = await bcrypt.hash(MITRA_PASSWORD, 12);
        mitra = await prisma.user.create({
            data: {
                email: MITRA_EMAIL,
                password: hashedPassword,
                name: MITRA_NAME,
                role: 'MITRA',
                isMitra: true,
            },
        });
        console.log(`[SEED] Mitra user dibuat: ${mitra.email} (id: ${mitra.id})`);
    }
    else {
        mitra = await prisma.user.update({
            where: { id: mitra.id },
            data: { isMitra: true, role: 'MITRA' },
        });
        console.log(`[SEED] Mitra user sudah ada: ${mitra.email} (id: ${mitra.id})`);
    }
    await prisma.mitraProfile.upsert({
        where: { userId: mitra.id },
        create: {
            userId: mitra.id,
            category: 'jastip,beberes,pindahan',
            description: 'Melayani jastip makanan, minuman, dan barang di sekitar Sleman & Yogyakarta Kota. Beberes kos dan bantuan pindahan juga tersedia.',
            bio: 'Mahasiswa UGM semester 5, siap bantu keperluanmu!',
            campus: 'Universitas Gadjah Mada',
            domicile: 'Sleman',
            phoneNumber: '081234567890',
            price: 5000,
            isVerified: true,
            isOnline: true,
            rating: 4.8,
            totalReviews: 12,
            totalOrders: 24,
        },
        update: {
            isVerified: true,
            isOnline: true,
        },
    });
    console.log(`[SEED] MitraProfile dibuat/diupdate untuk: ${MITRA_NAME}`);
    console.log(`\n[SEED] Akun mitra test:`);
    console.log(`  Email   : ${MITRA_EMAIL}`);
    console.log(`  Password: ${MITRA_PASSWORD}`);
    console.log(`  ID      : ${mitra.id}`);
    console.log(`  Kategori: jastip, beberes, pindahan`);
}
main()
    .catch((e) => {
    console.error('[SEED] Error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-mitra.js.map