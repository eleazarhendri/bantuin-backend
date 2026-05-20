import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
  IsIn,
} from 'class-validator';

export class UpdateMitraServiceDto {
  @IsOptional()
  @IsString()
  @IsIn(
    ['jastip', 'servis', 'les', 'beberes', 'desain', 'pindahan', 'joki', 'curhat'],
    { message: 'categoryId tidak valid' },
  )
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @IsIn(['jam', 'item', 'sesi', 'hari', 'proyek'])
  priceUnit?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
