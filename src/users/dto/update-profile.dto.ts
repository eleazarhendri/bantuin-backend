import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Nama maksimal 100 karakter' })
  name?: string;
}
