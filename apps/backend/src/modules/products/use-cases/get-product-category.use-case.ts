import { ProductCategoriesRepository } from "../repositories/product-categories-repository.js";
import { ProductCategoryNotFoundError } from "../errors/product-category-not-found-error.js";

interface GetProductCategoryRequest {
  categoryId: string;
}

export class GetProductCategoryUseCase {
  constructor(
    private readonly productCategoriesRepository: ProductCategoriesRepository,
  ) {}

  async execute({ categoryId }: GetProductCategoryRequest) {
    const category =
      await this.productCategoriesRepository.findById(categoryId);

    if (!category) {
      throw new ProductCategoryNotFoundError();
    }

    return category;
  }
}
