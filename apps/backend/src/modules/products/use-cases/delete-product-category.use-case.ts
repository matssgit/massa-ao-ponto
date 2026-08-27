import { ProductCategoriesRepository } from "../repositories/product-categories-repository.js";
import { ProductCategoryHasProductsError } from "../errors/product-category-has-products-error.js";
import { ProductCategoryNotFoundError } from "../errors/product-category-not-found-error.js";
import { ProductsRepository } from "../repositories/products-repository.js";

interface DeleteProductCategoryRequest {
  restaurantId: string;
  categoryId: string;
}

export class DeleteProductCategoryUseCase {
  constructor(
    private readonly productCategoriesRepository: ProductCategoriesRepository,
    private readonly productsRepository: ProductsRepository,
  ) {}

  async execute({ restaurantId, categoryId }: DeleteProductCategoryRequest) {
    const category =
      await this.productCategoriesRepository.findByIdAndRestaurantId(
        categoryId,
        restaurantId,
      );

    if (!category) {
      throw new ProductCategoryNotFoundError();
    }

    const products = await this.productsRepository.findMany({
      restaurantId,
      categoryId,
    });

    if (products.length > 0) {
      throw new ProductCategoryHasProductsError();
    }

    await this.productCategoriesRepository.delete(categoryId);
  }
}
