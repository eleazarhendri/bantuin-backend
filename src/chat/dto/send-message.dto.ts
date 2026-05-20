import { IsString, IsInt, IsOptional, IsIn, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @IsInt()
  conversationId: number;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  @IsIn(['text', 'image'])
  type?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class GetOrCreateConversationDto {
  @IsInt()
  mitraId: number;

  @IsOptional()
  @IsInt()
  orderId?: number;

  @IsOptional()
  @IsString()
  categoryName?: string;
}
