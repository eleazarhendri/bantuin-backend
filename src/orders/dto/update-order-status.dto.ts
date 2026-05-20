import { IsString, IsIn } from 'class-validator';

const VALID_STATUSES = [
  'accepted',
  'shopping',
  'on_the_way',
  'diagnosis',
  'in_progress',
  'ready_pickup',
  'done',
  'cancelled',
] as const;

export class UpdateOrderStatusDto {
  @IsString()
  @IsIn(VALID_STATUSES, {
    message: `Status harus salah satu dari: ${VALID_STATUSES.join(', ')}`,
  })
  status: string;
}
