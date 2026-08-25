import { AddonNotFoundError } from "../errors/addon-not-found-error.js";
import { AddonRestaurantMismatchError } from "../errors/addon-restaurant-mismatch-error.js";
import { AddonsRepository } from "../repositories/addons-repository.js";
import { ProductAddonAlreadyExistsError } from "../errors/product-addon-already-exists-error.js";
import { ProductAddonsRepository } from "../repositories/product-addons-repository.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { ProductRestaurantMismatchError } from "../../orders/errors/product-restaurant-mismatch-error.js";
import { ProductsRepository } from "../repositories/products-repository.js";

interface AddAddonToProductRequest {
  restaurantId: string;
  productId: string;
  addonId: string;
}

export class AddAddonToProductUseCase {
  constructor(
    private readonly productAddonsRepository: ProductAddonsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly addonsRepository: AddonsRepository,
  ) {}

  async execute({
    restaurantId,
    productId,
    addonId,
  }: AddAddonToProductRequest): Promise<void> {
    const product = await this.productsRepository.findById(productId);
    if (!product) throw new ProductNotFoundError();
    if (product.restaurantId !== restaurantId)
      throw new ProductRestaurantMismatchError();

    const addon = await this.addonsRepository.findById(addonId);
    if (!addon) throw new AddonNotFoundError();
    if (addon.restaurantId !== restaurantId)
      throw new AddonRestaurantMismatchError();

    const exists = await this.productAddonsRepository.exists({
      productId,
      addonId,
    });
    if (exists) throw new ProductAddonAlreadyExistsError();

    await this.productAddonsRepository.create({ productId, addonId });
  }
}
