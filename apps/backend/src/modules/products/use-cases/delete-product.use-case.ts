import { OrderItemsRepository } from "../../orders/repositories/order-items-repository.js";
import { ProductHasOrdersError } from "../errors/product-has-orders-error.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { ProductsRepository } from "../repositories/products-repository.js";

interface DeleteProductRequest {
  restaurantId: string;
  productId: string;
}

export class DeleteProductUseCase {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly orderItemsRepository: OrderItemsRepository,
  ) {}

  async execute({ restaurantId, productId }: DeleteProductRequest) {
    const product = await this.productsRepository.findById(productId);

    if (!product || product.restaurantId !== restaurantId) {
      throw new ProductNotFoundError();
    }

    const hasOrders = await this.orderItemsRepository.hasByProductId(productId);

    if (hasOrders) {
      throw new ProductHasOrdersError();
    }

    await this.productsRepository.delete(productId);
  }
}
