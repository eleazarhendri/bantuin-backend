import { IsString, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';

export class UpdateMitraProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  campus?: string;

  @IsOptional()
  @IsString()
  domicile?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
