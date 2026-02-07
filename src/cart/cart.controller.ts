import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@ApiTags('Cart')
@Controller('api/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new cart' })
  async create() {
    const cart = await this.cartService.create();
    return { id: cart.id, items: [], totalUsdc: 0 };
  }

  @Post(':cartId/items')
  @ApiOperation({ summary: 'Add item to cart' })
  async addItem(
    @Param('cartId') cartId: string,
    @Body() dto: AddToCartDto,
  ) {
    const cart = await this.cartService.addItem(cartId, dto);
    return {
      ...cart,
      totalUsdc: this.cartService.calculateSubtotal(cart),
    };
  }

  @Get(':cartId')
  @ApiOperation({ summary: 'Get cart contents' })
  async findOne(@Param('cartId') cartId: string) {
    const cart = await this.cartService.findOne(cartId);
    return {
      ...cart,
      totalUsdc: this.cartService.calculateSubtotal(cart),
    };
  }

  @Delete(':cartId/items/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(
    @Param('cartId') cartId: string,
    @Param('productId') productId: string,
  ) {
    const cart = await this.cartService.removeItem(cartId, productId);
    return {
      ...cart,
      totalUsdc: this.cartService.calculateSubtotal(cart),
    };
  }
}
