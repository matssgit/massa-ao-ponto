import {
  RestaurantsRepository,
  UpdateRestaurantInput,
} from "../repositories/restaurants-repository.js";

import { RestaurantNotFoundError } from "../errors/restaurant-not-found-error.js";

interface UpdateRestaurantRequest extends UpdateRestaurantInput {
  restaurantId: string;
}

export class UpdateRestaurantUseCase {
  constructor(
    private readonly restaurantsRepository: RestaurantsRepository,
  ) {}

  async execute({ restaurantId, ...data }: UpdateRestaurantRequest) {
    const restaurant = await this.restaurantsRepository.findById(restaurantId);

    if (!restaurant) {
      throw new RestaurantNotFoundError();
    }

    if (Object.keys(data).length === 0) {
      return restaurant;
    }

    const updatedRestaurant = await this.restaurantsRepository.update(
      restaurantId,
      data,
    );

    if (!updatedRestaurant) {
      throw new RestaurantNotFoundError();
    }

    return updatedRestaurant;
  }
}
