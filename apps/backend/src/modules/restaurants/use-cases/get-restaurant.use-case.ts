import {
  Restaurant,
  RestaurantsRepository,
} from "../repositories/restaurants-repository.js";

import { RestaurantNotFoundError } from "../errors/restaurant-not-found-error.js";

interface GetRestaurantUseCaseRequest {
  restaurantId: string;
}

export class GetRestaurantUseCase {
  constructor(private restaurantsRepository: RestaurantsRepository) {}

  async execute({
    restaurantId,
  }: GetRestaurantUseCaseRequest): Promise<Restaurant> {
    const restaurant = await this.restaurantsRepository.findById(restaurantId);

    if (!restaurant) {
      throw new RestaurantNotFoundError();
    }

    return restaurant;
  }
}
