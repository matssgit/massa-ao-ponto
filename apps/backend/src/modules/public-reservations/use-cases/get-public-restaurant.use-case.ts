import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import type { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import { publicRestaurantView } from "../public-view.js";

export class GetPublicRestaurantUseCase {
  constructor(private readonly restaurants: RestaurantsRepository) {}

  async execute(slug: string) {
    const restaurant = await this.restaurants.findPublishedBySlug(slug);
    if (!restaurant) throw new RestaurantNotFoundError();
    return publicRestaurantView(restaurant);
  }
}