import { IsString, IsOptional, MaxLength } from 'class-validator';

export class RejectRegistrationDto {
  /**
   * Alasan penolakan — wajib diisi saat reject agar user tahu
   * apa yang perlu diperbaiki sebelum mendaftar ulang.
   */
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Catatan admin maksimal 500 karakter' })
  adminNote?: string;
}
