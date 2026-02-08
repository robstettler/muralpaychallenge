import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  CREATING_WALLET = 'CREATING_WALLET',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', default: OrderStatus.AWAITING_PAYMENT })
  status: OrderStatus;

  @Column('decimal', { precision: 12, scale: 2 })
  subtotalUsdc: number;

  @Column('decimal', { precision: 12, scale: 2 })
  totalUsdc: number;

  @Column({ type: 'varchar', nullable: true })
  walletAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  blockchain: string | null;

  @Column({ type: 'varchar', default: 'USDC' })
  tokenSymbol: string;

  @Column({ type: 'varchar', nullable: true })
  muralAccountId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column('timestamptz')
  expiresAt: Date;

  @Column({ type: 'varchar', nullable: true })
  transactionHash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items: OrderItem[];
}
