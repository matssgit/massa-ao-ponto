import { ProductCategoriesRepository } from "../repositories/product-categories-repository.js";
import { ProductCategoryNotFoundError } from "../errors/product-category-not-found-error.js";

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
      await this.productCategoriesRepository.findByIdAndRestaurantId(
        categoryId,
        restaurantId,
      );

    if (!category) {
      throw new ProductCategoryNotFoundError();
    }

    return await this.productCategoriesRepository.update(categoryId, {
      active: !category.active,
    });
  }
}
