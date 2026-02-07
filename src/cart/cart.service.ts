import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductsService } from '../products/products.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    private readonly productsService: ProductsService,
  ) {}

  async create(): Promise<Cart> {
    const cart = this.cartRepo.create();
    return this.cartRepo.save(cart);
  }

  async findOne(id: string): Promise<Cart> {
    const cart = await this.cartRepo.findOne({
      where: { id },
      relations: ['items', 'items.product'],
    });
    if (!cart) throw new NotFoundException('Cart not found');
    return cart;
  }

  async addItem(cartId: string, dto: AddToCartDto): Promise<Cart> {
    const cart = await this.findOne(cartId);
    const product = await this.productsService.findOne(dto.productId);
    if (!product) throw new BadRequestException('Product not found');

    const existingItem = cart.items.find(
      (item) => item.productId === dto.productId,
    );
    if (existingItem) {
      existingItem.quantity += dto.quantity;
      await this.cartItemRepo.save(existingItem);
    } else {
      const item = this.cartItemRepo.create({
        cartId,
        productId: dto.productId,
        quantity: dto.quantity,
      });
      await this.cartItemRepo.save(item);
    }

    return this.findOne(cartId);
  }

  async removeItem(cartId: string, productId: string): Promise<Cart> {
    const cart = await this.findOne(cartId);
    const item = cart.items.find((i) => i.productId === productId);
    if (!item) throw new NotFoundException('Item not in cart');
    await this.cartItemRepo.remove(item);
    return this.findOne(cartId);
  }

  async clearCart(cartId: string): Promise<void> {
    await this.cartItemRepo.delete({ cartId });
  }

  calculateSubtotal(cart: Cart): number {
    return cart.items.reduce(
      (sum, item) => sum + Number(item.product.priceUsdc) * item.quantity,
      0,
    );
  }
}
