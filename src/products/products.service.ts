import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';

const SEED_PRODUCTS = [
  {
    name: 'Wireless Earbuds',
    description: 'High-quality Bluetooth earbuds with noise cancellation and 24-hour battery life.',
    priceUsdc: 49.99,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=300&fit=crop',
  },
  {
    name: 'Mechanical Keyboard',
    description: 'RGB backlit mechanical keyboard with Cherry MX switches and USB-C connectivity.',
    priceUsdc: 89.99,
    imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&h=300&fit=crop',
  },
  {
    name: 'USB-C Hub',
    description: '7-in-1 USB-C hub with HDMI, USB 3.0, SD card reader, and 100W power delivery.',
    priceUsdc: 34.99,
    imageUrl: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400&h=300&fit=crop',
  },
  {
    name: 'Webcam HD',
    description: '1080p HD webcam with built-in microphone, auto-focus, and privacy shutter.',
    priceUsdc: 59.99,
    imageUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=300&fit=crop',
  },
  {
    name: 'Laptop Stand',
    description: 'Adjustable aluminum laptop stand with ergonomic design for improved posture.',
    priceUsdc: 29.99,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=300&fit=crop',
  },
  {
    name: 'Portable Charger',
    description: '20000mAh portable power bank with fast charging and dual USB-C ports.',
    priceUsdc: 39.99,
    imageUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=300&fit=crop',
  },
];

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async onModuleInit() {
    const count = await this.productRepo.count();
    if (count === 0) {
      this.logger.log('Seeding products...');
      await this.productRepo.save(SEED_PRODUCTS);
      this.logger.log(`Seeded ${SEED_PRODUCTS.length} products`);
    }
  }

  findAll(): Promise<Product[]> {
    return this.productRepo.find();
  }

  findOne(id: string): Promise<Product | null> {
    return this.productRepo.findOneBy({ id });
  }
}
