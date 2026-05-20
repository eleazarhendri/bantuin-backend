import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── POST /orders — User membuat pesanan ───────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOrder(@Request() req, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.id, dto);
  }

  // ── GET /orders/my — Pesanan milik user yang login ────────────────────────
  @Get('my')
  getMyOrders(@Request() req) {
    return this.ordersService.getOrdersByUser(req.user.id);
  }

  // ── GET /orders/mitra — Pesanan yang masuk ke mitra yang login ────────────
  @Get('mitra')
  getMitraOrders(@Request() req) {
    return this.ordersService.getOrdersByMitra(req.user.id);
  }

  // ── GET /orders/wallet — Saldo & riwayat transaksi mitra ─────────────────
  @Get('wallet')
  getWallet(@Request() req) {
    return this.ordersService.getWallet(req.user.id);
  }

  // ── GET /orders/:id — Detail pesanan ─────────────────────────────────────
  @Get(':id')
  getOrderById(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.ordersService.getOrderById(id, req.user.id);
  }

  // ── PATCH /orders/:id/status — Mitra update status ───────────────────────
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, req.user.id, dto);
  }

  // ── DELETE /orders/:id — User batalkan pesanan ────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.ordersService.cancelOrder(id, req.user.id);
  }
}
