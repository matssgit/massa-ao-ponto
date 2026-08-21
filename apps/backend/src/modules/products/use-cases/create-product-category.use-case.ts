import { ProductCategoriesRepository } from "../repositories/product-categories-repository.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";

interface CreateProductCategoryRequest {
  restaurantId: string;
  name: string;
  description?: string | null;
  displayOrder: number;
}

export class CreateProductCategoryUseCase {
  constructor(
    private readonly productCategoriesRepository: ProductCategoriesRepository,
    private readonly restaurantsRepository: RestaurantsRepository,
  ) {}

  async execute(request: CreateProductCategoryRequest) {
    const restaurant = await this.restaurantsRepository.findById(
      request.restaurantId,
    );

    if (!restaurant) {
      throw new RestaurantNotFoundError();
    }

    return await this.productCategoriesRepository.create(request);
  }
}
