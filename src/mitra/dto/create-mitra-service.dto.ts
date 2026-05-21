import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  MaxLength,
  IsIn,
} from 'class-validator';

export class CreateMitraServiceDto {
  @IsString()
  @IsNotEmpty({ message: 'categoryId tidak boleh kosong' })
  @IsIn(
    ['jastip', 'servis', 'les', 'beberes', 'desain', 'pindahan', 'curhat'],
    { message: 'categoryId tidak valid' },
  )
  categoryId: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama jasa tidak boleh kosong' })
  @MaxLength(80, { message: 'Nama jasa maksimal 80 karakter' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Deskripsi tidak boleh kosong' })
  @MaxLength(500, { message: 'Deskripsi maksimal 500 karakter' })
  description: string;

  @IsNumber({}, { message: 'Harga harus berupa angka' })
  @Min(0, { message: 'Harga tidak boleh negatif' })
  price: number;

  @IsOptional()
  @IsString()
  @IsIn(['jam', 'item', 'sesi', 'hari', 'proyek'], {
    message: 'priceUnit harus salah satu dari: jam, item, sesi, hari, proyek',
  })
  priceUnit?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
