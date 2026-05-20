import { IsString, IsNotEmpty, MinLength, MaxLength, Matches, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class RegisterMitraDto {
  /**
   * Nomor Induk Kependudukan — 16 digit angka.
   */
  @IsString()
  @Matches(/^\d{16}$/, { message: 'NIK harus berupa 16 digit angka' })
  nik: string;

  /**
   * URL foto KTP yang sudah diupload ke storage.
   * userId diambil dari JWT (req.user.id) — tidak perlu dikirim dari client.
   */
  @IsString()
  @IsNotEmpty({ message: 'URL foto KTP tidak boleh kosong' })
  ktpUrl: string;

  /**
   * URL foto selfie dengan KTP.
   */
  @IsString()
  @IsNotEmpty({ message: 'URL foto selfie tidak boleh kosong' })
  selfieUrl: string;

  /**
   * Kategori jasa yang ditawarkan.
   */
  @IsString()
  @IsNotEmpty({ message: 'Kategori jasa tidak boleh kosong' })
  serviceCategory: string;

  /**
   * Deskripsi pengalaman dan keahlian mitra.
   */
  @IsString()
  @MinLength(20, { message: 'Deskripsi pengalaman minimal 20 karakter' })
  @MaxLength(1000, { message: 'Deskripsi pengalaman maksimal 1000 karakter' })
  experience: string;

  /**
   * Latitude lokasi toko/area layanan mitra (opsional).
   * Diisi saat pendaftaran jika mitra memilih lokasi dari peta.
   */
  @IsOptional()
  @IsNumber({}, { message: 'Latitude harus berupa angka' })
  @Min(-90, { message: 'Latitude tidak valid' })
  @Max(90, { message: 'Latitude tidak valid' })
  latitude?: number;

  /**
   * Longitude lokasi toko/area layanan mitra (opsional).
   */
  @IsOptional()
  @IsNumber({}, { message: 'Longitude harus berupa angka' })
  @Min(-180, { message: 'Longitude tidak valid' })
  @Max(180, { message: 'Longitude tidak valid' })
  longitude?: number;
}
