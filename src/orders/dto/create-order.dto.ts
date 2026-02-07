import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ description: 'Cart ID to create order from' })
  @IsUUID()
  cartId: string;
}
