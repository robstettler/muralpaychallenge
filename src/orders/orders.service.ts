import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import { Interval } from '@nestjs/schedule';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartService } from '../cart/cart.service';
import { MuralService } from '../mural/mural.service';
import { Wallet, WalletStatus } from '../mural/entities/wallet.entity';

const ORDER_EXPIRY_MINUTES = 30;

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    private readonly cartService: CartService,
    private readonly muralService: MuralService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.bootstrapWalletPool();
  }

  private async bootstrapWalletPool() {
    const walletCount = await this.walletRepo.count();
    if (walletCount > 0) {
      this.logger.log(`Wallet pool has ${walletCount} wallets — skipping bootstrap`);
      return;
    }

    this.logger.log('No wallets in DB — checking Mural for existing accounts...');
    try {
      const accounts = await this.muralService.getAllAccounts();
      if (accounts.length === 0) {
        this.logger.log('No existing Mural accounts — requesting a new one');
        await this.requestNewWallet();
        return;
      }

      for (const account of accounts) {
        if (!account.isApiEnabled) continue;
        const existing = await this.walletRepo.findOne({
          where: { muralAccountId: account.id },
        });
        if (existing) continue;

        const wallet = this.walletRepo.create({
          muralAccountId: account.id,
        });

        if (account.status === 'ACTIVE' && account.accountDetails) {
          wallet.walletAddress = account.accountDetails.walletDetails.walletAddress;
          wallet.blockchain = account.accountDetails.walletDetails.blockchain;
          wallet.status = WalletStatus.AVAILABLE;
        }

        await this.walletRepo.save(wallet);
        this.logger.log(
          `Imported Mural account ${account.id} as ${wallet.status}`,
        );
      }

      const availableCount = await this.walletRepo.count({
        where: { status: WalletStatus.AVAILABLE },
      });
      if (availableCount === 0) {
        this.logger.log('No AVAILABLE wallets after import — requesting a new one');
        await this.requestNewWallet();
      }
    } catch (error) {
      this.logger.error('Failed to bootstrap wallet pool', error);
    }
  }

  /**
   * Atomically claim an AVAILABLE wallet using SELECT FOR UPDATE SKIP LOCKED.
   * Returns null if no wallet is available.
   */
  private async claimAvailableWallet(): Promise<Wallet | null> {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(Wallet)
      .set({ status: WalletStatus.ASSIGNED })
      .where(
        `id = (
          SELECT id FROM wallets
          WHERE status = :status
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )`,
        { status: WalletStatus.AVAILABLE },
      )
      .returning('*')
      .execute();

    if (result.affected === 0) return null;
    return this.walletRepo.findOne({ where: { id: result.raw[0].id } });
  }

  async createFromCart(cartId: string): Promise<Order> {
    const cart = await this.cartService.findOne(cartId);
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const subtotal = this.cartService.calculateSubtotal(cart);
    const totalUsdc = subtotal;

    // Atomically grab an AVAILABLE wallet
    let wallet = await this.claimAvailableWallet();

    // If none available, try INITIALIZING wallets (lazy activation)
    if (!wallet) {
      const initializingWallets = await this.walletRepo.find({
        where: { status: WalletStatus.INITIALIZING },
      });
      for (const w of initializingWallets) {
        const activated = await this.tryActivateWallet(w);
        if (activated) {
          activated.status = WalletStatus.ASSIGNED;
          await this.walletRepo.save(activated);
          wallet = activated;
          break;
        }
      }
    }

    // If still none, create a new Mural account
    if (!wallet) {
      const newWallet = await this.requestNewWallet();
      newWallet.status = WalletStatus.ASSIGNED;
      await this.walletRepo.save(newWallet);
      wallet = newWallet;
    }

    const isWalletReady = wallet.walletAddress !== null;

    const order = this.orderRepo.create({
      status: isWalletReady
        ? OrderStatus.AWAITING_PAYMENT
        : OrderStatus.CREATING_WALLET,
      subtotalUsdc: subtotal,
      totalUsdc,
      walletAddress: wallet.walletAddress,
      blockchain: wallet.blockchain,
      tokenSymbol: 'USDC',
      muralAccountId: wallet.muralAccountId,
      expiresAt: new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000),
      items: cart.items.map((item) =>
        this.orderItemRepo.create({
          productName: item.product.name,
          quantity: item.quantity,
          unitPriceUsdc: item.product.priceUsdc,
        }),
      ),
    });

    const saved = await this.orderRepo.save(order);

    wallet.assignedToOrderId = saved.id;
    await this.walletRepo.save(wallet);

    await this.cartService.clearCart(cartId);

    // Replenish pool if running low
    const remainingAvailable = await this.walletRepo.count({
      where: { status: WalletStatus.AVAILABLE },
    });
    if (remainingAvailable === 0) {
      this.requestNewWallet().catch((err) =>
        this.logger.error('Failed to replenish wallet pool', err),
      );
    }

    return saved;
  }

  async requestNewWallet(): Promise<Wallet> {
    const account = await this.muralService.createAccount(
      `pool-wallet-${Date.now()}`,
    );
    const wallet = this.walletRepo.create({
      muralAccountId: account.id,
    });

    if (account.status === 'ACTIVE' && account.accountDetails) {
      wallet.walletAddress =
        account.accountDetails.walletDetails.walletAddress;
      wallet.blockchain = account.accountDetails.walletDetails.blockchain;
      wallet.status = WalletStatus.AVAILABLE;
    }

    return this.walletRepo.save(wallet);
  }

  private async tryActivateWallet(wallet: Wallet): Promise<Wallet | null> {
    try {
      const account = await this.muralService.getAccountById(
        wallet.muralAccountId,
      );
      if (account.status === 'ACTIVE' && account.accountDetails) {
        wallet.walletAddress =
          account.accountDetails.walletDetails.walletAddress;
        wallet.blockchain = account.accountDetails.walletDetails.blockchain;
        wallet.status = WalletStatus.AVAILABLE;
        await this.walletRepo.save(wallet);
        this.logger.log(`Wallet ${wallet.id} activated (account ${wallet.muralAccountId})`);
        return wallet;
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to check wallet ${wallet.muralAccountId} activation`,
        error,
      );
      return null;
    }
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('Order not found');

    // Lazy wallet activation: if CREATING_WALLET, check if wallet is now ACTIVE
    if (order.status === OrderStatus.CREATING_WALLET && order.muralAccountId) {
      const wallet = await this.walletRepo.findOne({
        where: { muralAccountId: order.muralAccountId },
      });
      if (wallet && wallet.status === WalletStatus.ASSIGNED && wallet.walletAddress === null) {
        const activated = await this.tryActivateWallet(wallet);
        if (activated) {
          wallet.status = WalletStatus.ASSIGNED;
          wallet.assignedToOrderId = order.id;
          await this.walletRepo.save(wallet);

          order.status = OrderStatus.AWAITING_PAYMENT;
          order.walletAddress = activated.walletAddress;
          order.blockchain = activated.blockchain;
          await this.orderRepo.save(order);
        }
      }
    }

    return order;
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepo.find({
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async matchDeposit(
    tokenAmount: number,
    transactionHash: string,
    muralAccountId: string,
  ): Promise<Order | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: {
          status: OrderStatus.AWAITING_PAYMENT,
          muralAccountId,
        },
        relations: ['items'],
      });

      if (!order) {
        await queryRunner.rollbackTransaction();
        this.logger.warn(
          `No pending order found for account ${muralAccountId} (tx: ${transactionHash})`,
        );
        return null;
      }

      order.status = OrderStatus.PAID;
      order.transactionHash = transactionHash;
      order.paidAt = new Date();
      await queryRunner.manager.save(order);

      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { muralAccountId },
      });
      if (wallet) {
        wallet.status = WalletStatus.AVAILABLE;
        wallet.assignedToOrderId = null;
        await queryRunner.manager.save(wallet);
        this.logger.log(`Wallet ${wallet.id} released back to pool`);
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Order ${order.id} marked as PAID (tx: ${transactionHash})`,
      );
      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  @Interval(60_000)
  async expireOrders() {
    const now = new Date();
    const expired = await this.orderRepo.find({
      where: [
        { status: OrderStatus.AWAITING_PAYMENT, expiresAt: LessThan(now) },
        { status: OrderStatus.CREATING_WALLET, expiresAt: LessThan(now) },
      ],
    });

    for (const order of expired) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        order.status = OrderStatus.EXPIRED;
        await queryRunner.manager.save(order);
        this.logger.log(`Order ${order.id} expired`);

        if (order.muralAccountId) {
          const wallet = await queryRunner.manager.findOne(Wallet, {
            where: { muralAccountId: order.muralAccountId },
          });
          if (wallet && wallet.status === WalletStatus.ASSIGNED) {
            wallet.status = wallet.walletAddress
              ? WalletStatus.AVAILABLE
              : WalletStatus.INITIALIZING;
            wallet.assignedToOrderId = null;
            await queryRunner.manager.save(wallet);
            this.logger.log(`Wallet ${wallet.id} released back to pool`);
          }
        }

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(`Failed to expire order ${order.id}`, error);
      } finally {
        await queryRunner.release();
      }
    }
  }
}
