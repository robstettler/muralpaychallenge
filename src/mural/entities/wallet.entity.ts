import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum WalletStatus {
  INITIALIZING = 'INITIALIZING',
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
}

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  muralAccountId: string;

  @Column({ nullable: true })
  walletAddress: string | null;

  @Column({ nullable: true })
  blockchain: string | null;

  @Column({ type: 'varchar', default: WalletStatus.INITIALIZING })
  status: WalletStatus;

  @Column({ nullable: true })
  assignedToOrderId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
