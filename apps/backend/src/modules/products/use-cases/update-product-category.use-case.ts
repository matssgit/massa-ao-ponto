import { ProductCategoriesRepository } from "../repositories/product-categories-repository.js";
import { ProductCategoryNotFoundError } from "../errors/product-category-not-found-error.js";

interface UpdateProductCategoryRequest {
  restaurantId: string;
  categoryId: string;
  name?: string;
  description?: string | null;
  displayOrder?: number;
  active?: boolean;
}

export class UpdateProductCategoryUseCase {
  constructor(
    private readonly productCategoriesRepository: ProductCategoriesRepository,
  ) {}

  async execute({
    restaurantId,
    categoryId,
    ...data
  }: UpdateProductCategoryRequest) {
    const category =
      await this.productCategoriesRepository.findByIdAndRestaurantId(
        categoryId,
        restaurantId,
      );

    if (!category) {
      throw new ProductCategoryNotFoundError();
    }

    if (Object.keys(data).length === 0) {
      return category;
    }

    return await this.productCategoriesRepository.update(categoryId, data);
  }
}
