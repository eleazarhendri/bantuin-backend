import {
  IsInt,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class CreateOrderDto {
  @IsInt()
  mitraId: number;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  categoryName: string;

  @IsString()
  @IsNotEmpty()
  itemDescription: string;

  @IsOptional()
  @IsString()
  storeName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsNumber()
  @Min(0)
  itemBudget: number;

  @IsNumber()
  @Min(0)
  serviceFee: number;
}
