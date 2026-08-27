import { ProductCategoriesRepository } from "../repositories/product-categories-repository.js";
import { ProductCategoryNotFoundError } from "../errors/product-category-not-found-error.js";

interface GetProductCategoryRequest {
  restaurantId: string;
  categoryId: string;
}

export class GetProductCategoryUseCase {
  constructor(
    private readonly productCategoriesRepository: ProductCategoriesRepository,
  ) {}

  async execute({ restaurantId, categoryId }: GetProductCategoryRequest) {
    const category =
      await this.productCategoriesRepository.findByIdAndRestaurantId(
        categoryId,
        restaurantId,
      );

    if (!category) {
      throw new ProductCategoryNotFoundError();
    }

    return category;
  }
}
