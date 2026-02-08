import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Payout } from './entities/payout.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CartModule } from '../cart/cart.module';
import { MuralModule } from '../mural/mural.module';
import { Wallet } from '../mural/entities/wallet.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Payout, Wallet]),
    CartModule,
    MuralModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
