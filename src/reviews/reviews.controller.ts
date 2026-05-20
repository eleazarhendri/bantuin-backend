import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { IsNumber, IsString, Min, Max, IsNotEmpty, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

class CreateReviewDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  comment: string;
}

interface AuthenticatedRequest {
  user: { id: number; email: string; role: string };
}

@Controller('orders')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ── POST /api/orders/:id/review — Submit ulasan ───────────────────────────
  @Post(':id/review')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async submitReview(
    @Param('id', ParseIntPipe) orderId: number,
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.submitReview(
      req.user.id,
      orderId,
      dto.rating,
      dto.comment,
    );
  }

  // ── GET /api/orders/mitra/:mitraId/reviews — Ulasan mitra ─────────────────
  @Get('mitra/:mitraId/reviews')
  @UseGuards(OptionalJwtAuthGuard)
  async getMitraReviews(@Param('mitraId', ParseIntPipe) mitraId: number) {
    return this.reviewsService.getReviewsByMitra(mitraId);
  }
}
