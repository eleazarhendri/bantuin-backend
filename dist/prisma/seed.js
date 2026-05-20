"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@bantuin.id';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@Bantuin2025!';
    const ADMIN_NAME = 'Admin Bantuin';
    const existing = await prisma.user.findUnique({
        where: { email: ADMIN_EMAIL },
    });
    if (existing) {
        console.log(`[SEED] Admin sudah ada: ${ADMIN_EMAIL} (id: ${existing.id})`);
        if (existing.role !== 'ADMIN') {
            await prisma.user.update({
                where: { id: existing.id },
                data: { role: 'ADMIN' },
            });
            console.log(`[SEED] Role diupdate ke ADMIN untuk: ${ADMIN_EMAIL}`);
        }
        return;
    }
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
//# sourceMappingURL=seed.js.map