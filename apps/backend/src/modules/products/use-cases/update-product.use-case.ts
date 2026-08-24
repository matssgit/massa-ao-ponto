import { ProductCategoriesRepository } from "../repositories/product-categories-repository.js";
import { ProductCategoryNotFoundError } from "../errors/product-category-not-found-error.js";
import { ProductCategoryRestaurantMismatchError } from "../errors/product-category-restaurant-mismatch-error.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { ProductsRepository } from "../repositories/products-repository.js";

export interface UpdateProductRequest {
  restaurantId: string;
  productId: string;
  name?: string;
  description?: string | null;
  price?: number;
  categoryId?: string;
  displayOrder?: number;
  active?: boolean;
}

export class UpdateProductUseCase {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly productCategoriesRepository: ProductCategoriesRepository,
  ) {}

  async execute({ restaurantId, productId, ...data }: UpdateProductRequest) {
    const product = await this.productsRepository.findById(productId);

    if (!product || product.restaurantId !== restaurantId) {
      throw new ProductNotFoundError();
    }

    if (data.categoryId && data.categoryId !== product.categoryId) {
      const category = await this.productCategoriesRepository.findById(
        data.categoryId,
      );
      if (!category) throw new ProductCategoryNotFoundError();
      if (category.restaurantId !== restaurantId)
        throw new ProductCategoryRestaurantMismatchError();
    }

    if (Object.keys(data).length === 0) {
      return product;
    }

    return await this.productsRepository.update(productId, data);
  }
}
