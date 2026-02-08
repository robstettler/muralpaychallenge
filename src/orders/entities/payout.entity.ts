import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PayoutStatus {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  muralPayoutRequestId: string;

  @Column({ type: 'varchar', nullable: true })
  muralPayoutId: string | null;

  @Column({ type: 'varchar', default: PayoutStatus.INITIATED })
  status: PayoutStatus;

  @Column('decimal', { precision: 12, scale: 2 })
  amountUsdc: number;

  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  amountCop: number | null;

  @Column('decimal', { precision: 12, scale: 4, nullable: true })
  exchangeRate: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
