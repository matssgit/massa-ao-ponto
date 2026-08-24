import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { ProductsRepository } from "../repositories/products-repository.js";

interface ToggleProductStatusRequest {
  restaurantId: string;
  productId: string;
}

export class ToggleProductStatusUseCase {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async execute({ restaurantId, productId }: ToggleProductStatusRequest) {
    const product = await this.productsRepository.findById(productId);

    if (!product || product.restaurantId !== restaurantId) {
      throw new ProductNotFoundError();
    }

    return await this.productsRepository.update(productId, {
      active: !product.active,
    });
  }
}
