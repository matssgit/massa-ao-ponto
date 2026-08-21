import { ProductCategoriesRepository } from "../repositories/product-categories-repository.js";
import { ProductCategoryNotFoundError } from "../errors/product-category-not-found-error.js";
import { ProductCategoryRestaurantMismatchError } from "../errors/product-category-restaurant-mismatch-error.js";
import { ProductsRepository } from "../repositories/products-repository.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";

interface CreateProductRequest {
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  displayOrder: number;
}

export class CreateProductUseCase {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly productCategoriesRepository: ProductCategoriesRepository,
    private readonly restaurantsRepository: RestaurantsRepository,
  ) {}

  async execute(request: CreateProductRequest) {
    const restaurant = await this.restaurantsRepository.findById(
      request.restaurantId,
    );

    if (!restaurant) {
      throw new RestaurantNotFoundError();
    }

    const category = await this.productCategoriesRepository.findById(
      request.categoryId,
    );

    if (!category) {
      throw new ProductCategoryNotFoundError();
    }

    if (category.restaurantId !== request.restaurantId) {
      throw new ProductCategoryRestaurantMismatchError();
    }

    return await this.productsRepository.create(request);
  }
}
