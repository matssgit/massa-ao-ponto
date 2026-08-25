import { ProductCategoriesRepository } from "../repositories/product-categories-repository.js";
import { ProductCategoryHasProductsError } from "../errors/product-category-has-products-error.js";
import { ProductCategoryNotFoundError } from "../errors/product-category-not-found-error.js";
import { ProductCategoryRestaurantMismatchError } from "../errors/product-category-restaurant-mismatch-error.js";
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
      await this.productCategoriesRepository.findById(categoryId);

    if (!category) {
      throw new ProductCategoryNotFoundError();
    }

    if (category.restaurantId !== restaurantId) {
      throw new ProductCategoryRestaurantMismatchError();
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
