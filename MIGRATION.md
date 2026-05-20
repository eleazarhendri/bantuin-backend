# Panduan Migrasi Database

## Migrasi Terbaru: Tambah field `photoUrl` ke tabel `users`

### Kapan perlu dijalankan?
Setelah update kode yang menambahkan field `photoUrl` ke `schema.prisma`.

### Langkah

```bash
cd bantuin-backend

# 1. Generate Prisma Client dari schema terbaru
npm run prisma:generate

# 2. Jalankan migrasi (buat kolom photoUrl di tabel users)
npm run prisma:migrate
# Saat diminta nama migrasi, ketik:
# add_photo_url_to_users

# 3. Restart server
npm run start:dev
```

### Verifikasi

Buka Prisma Studio untuk memastikan kolom sudah ada:
```bash
npm run prisma:studio
```

Tabel `users` seharusnya sekarang punya kolom `photoUrl` (nullable String).

---

## Riwayat Migrasi

| Nama | Deskripsi |
|---|---|
| `init_auth` | Buat tabel users, mitra_profiles |
| `add_mitra_registration` | Tambah tabel mitra_registrations, field isMitra |
| `add_photo_url_to_users` | Tambah field photoUrl ke tabel users |
