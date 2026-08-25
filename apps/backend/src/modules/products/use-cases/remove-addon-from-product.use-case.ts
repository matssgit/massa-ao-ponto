import { ProductAddonNotFoundError } from "../errors/product-addon-not-found-error.js";
import { ProductAddonsRepository } from "../repositories/product-addons-repository.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { ProductRestaurantMismatchError } from "../../orders/errors/product-restaurant-mismatch-error.js";
import { ProductsRepository } from "../repositories/products-repository.js";

interface RemoveAddonFromProductRequest {
  restaurantId: string;
  productId: string;
  addonId: string;
}

export class RemoveAddonFromProductUseCase {
  constructor(
    private readonly productAddonsRepository: ProductAddonsRepository,
    private readonly productsRepository: ProductsRepository,
  ) {}

  async execute({
    restaurantId,
    productId,
    addonId,
  }: RemoveAddonFromProductRequest): Promise<void> {
    const product = await this.productsRepository.findById(productId);
    if (!product) throw new ProductNotFoundError();
    if (product.restaurantId !== restaurantId)
      throw new ProductRestaurantMismatchError();

    const exists = await this.productAddonsRepository.exists({
      productId,
      addonId,
    });
    if (!exists) throw new ProductAddonNotFoundError();

    await this.productAddonsRepository.delete({ productId, addonId });
  }
}
