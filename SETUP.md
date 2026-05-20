# Bantuin Backend — Setup Guide

## Prasyarat
- Node.js >= 18
- PostgreSQL >= 14
- npm atau yarn

---

## 1. Instalasi Package

```bash
# Masuk ke folder backend
cd bantuin-backend

# Install semua dependensi
npm install
```

### Package yang diinstall otomatis:
| Package | Fungsi |
|---|---|
| `@nestjs/jwt` | Membuat & memverifikasi JWT access token |
| `@nestjs/passport` + `passport-jwt` | Middleware autentikasi berbasis strategy |
| `bcrypt` | Hash & compare password (12 salt rounds) |
| `google-auth-library` | Verifikasi Google ID Token dari Flutter |
| `class-validator` + `class-transformer` | Validasi & transformasi DTO |
| `@prisma/client` | ORM untuk query PostgreSQL |

---

## 2. Konfigurasi Environment

```bash
# Salin file contoh
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/bantuin_db"
JWT_SECRET="ganti-dengan-string-acak-minimal-32-karakter"
JWT_EXPIRES_IN="7d"
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
```

> **Penting:** `GOOGLE_CLIENT_ID` harus sama persis dengan yang dipakai
> di Flutter (`google_sign_in` package). Dapatkan dari
> [Google Cloud Console](https://console.cloud.google.com/).

---

## 3. Setup Database

```bash
# Generate Prisma Client dari schema
npm run prisma:generate

# Jalankan migrasi (buat tabel di database)
npm run prisma:migrate
# Saat diminta nama migrasi, ketik: init_auth
```

---

## 4. Jalankan Server

```bash
# Development (hot reload)
npm run start:dev

# Production
npm run build
npm run start
```

Server berjalan di: `http://localhost:3000/api`

---

## 5. Endpoint Auth

### POST `/api/auth/register`
Daftar dengan email & password.
```json
// Request
{ "email": "farah@student.uny.ac.id", "password": "password123", "name": "Farah Aulia" }

// Response 201
{ "access_token": "eyJhbGci..." }
```

### POST `/api/auth/login`
Login dengan email & password.
```json
// Request
{ "email": "farah@student.uny.ac.id", "password": "password123" }

// Response 200
{ "access_token": "eyJhbGci..." }
```

### POST `/api/auth/google`
Login/register via Google. Flutter kirim `idToken` dari `google_sign_in`.
```json
// Request
{ "token": "<Google ID Token dari Flutter>" }

// Response 200
{ "access_token": "eyJhbGci..." }
```

### GET `/api/auth/me`
Cek token & ambil data user yang sedang login.
```
// Header
Authorization: Bearer <access_token>

// Response 200
{ "id": "clxxx...", "email": "farah@student.uny.ac.id", "role": "USER" }
```

---

## 6. Cara Pakai JWT di Endpoint Lain

```typescript
// Di controller manapun, tambahkan guard:
import { UseGuards, Get, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req) {
  // req.user berisi: { id, email, role }
  return req.user;
}
```

---

## 7. Integrasi Flutter

```dart
// Setelah google_sign_in berhasil, kirim idToken ke backend:
final googleUser = await GoogleSignIn().signIn();
final googleAuth = await googleUser!.authentication;
final idToken = googleAuth.idToken; // <-- ini yang dikirim ke /api/auth/google

final response = await http.post(
  Uri.parse('http://localhost:3000/api/auth/google'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'token': idToken}),
);
// Simpan access_token dari response untuk request selanjutnya
```
