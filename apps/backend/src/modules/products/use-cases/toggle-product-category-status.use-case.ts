import { ProductCategoriesRepository } from "../repositories/product-categories-repository.js";
import { ProductCategoryNotFoundError } from "../errors/product-category-not-found-error.js";
import { ProductCategoryRestaurantMismatchError } from "../errors/product-category-restaurant-mismatch-error.js";

interface ToggleProductCategoryStatusRequest {
  restaurantId: string;
  categoryId: string;
}

export class ToggleProductCategoryStatusUseCase {
  constructor(
    private readonly productCategoriesRepository: ProductCategoriesRepository,
  ) {}

  async execute({
    restaurantId,
    categoryId,
  }: ToggleProductCategoryStatusRequest) {
    const category =
      await this.productCategoriesRepository.findById(categoryId);

    if (!category) {
      throw new ProductCategoryNotFoundError();
    }

    if (category.restaurantId !== restaurantId) {
      throw new ProductCategoryRestaurantMismatchError();
    }

    return await this.productCategoriesRepository.update(categoryId, {
      active: !category.active,
    });
  }
}
