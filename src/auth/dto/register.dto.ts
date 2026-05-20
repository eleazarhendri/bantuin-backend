import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  @MaxLength(72, { message: 'Password maksimal 72 karakter' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'Nama minimal 2 karakter' })
  @MaxLength(100, { message: 'Nama maksimal 100 karakter' })
  name: string;
}
