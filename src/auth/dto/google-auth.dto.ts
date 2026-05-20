import { IsString, IsNotEmpty } from 'class-validator';

export class GoogleAuthDto {
  /**
   * ID Token yang dikirim dari Flutter setelah user berhasil
   * login via google_sign_in package.
   * Diverifikasi di backend menggunakan google-auth-library.
   */
  @IsString()
  @IsNotEmpty({ message: 'Google ID token tidak boleh kosong' })
  token: string;
}
