import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import type { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import { publicRestaurantView } from "../public-view.js";
import type { OperatingHoursRepository } from "../../restaurants/repositories/operating-hours-repository.js";
import type { SpecialHoursRepository } from "../../restaurants/repositories/special-hours-repository.js";

export class GetPublicRestaurantUseCase {
  constructor(private readonly restaurants: RestaurantsRepository, private readonly operatingHours: OperatingHoursRepository, private readonly specialHours: SpecialHoursRepository) {}

  async execute(slug: string) {
    const restaurant = await this.restaurants.findPublishedBySlug(slug);
    if (!restaurant) throw new RestaurantNotFoundError();
    const [hours, specialHours] = await Promise.all([
      this.operatingHours.findByRestaurantId(restaurant.id),
      this.specialHours.findByRestaurantId(restaurant.id),
    ]);
    return publicRestaurantView(restaurant, hours, specialHours);
  }
}
