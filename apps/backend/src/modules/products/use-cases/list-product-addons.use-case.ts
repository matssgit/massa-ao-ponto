import { Addon } from "../repositories/addons-repository.js";
import { ProductAddonsRepository } from "../repositories/product-addons-repository.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { ProductRestaurantMismatchError } from "../../orders/errors/product-restaurant-mismatch-error.js";
import { ProductsRepository } from "../repositories/products-repository.js";

interface ListProductAddonsRequest {
  restaurantId: string;
  productId: string;
}

export class ListProductAddonsUseCase {
  constructor(
    private readonly productAddonsRepository: ProductAddonsRepository,
    private readonly productsRepository: ProductsRepository,
  ) {}

  async execute({
    restaurantId,
    productId,
  }: ListProductAddonsRequest): Promise<Addon[]> {
    const product = await this.productsRepository.findById(productId);
    if (!product) throw new ProductNotFoundError();
    if (product.restaurantId !== restaurantId)
      throw new ProductRestaurantMismatchError();

    return await this.productAddonsRepository.findAddonsByProductId(productId);
  }
}
