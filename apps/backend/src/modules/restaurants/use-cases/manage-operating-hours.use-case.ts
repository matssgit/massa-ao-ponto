import { RestaurantNotFoundError } from "../errors/restaurant-not-found-error.js";
import { operatingHoursView } from "../operating-hours.js";
import type { OperatingHourInput, OperatingHoursRepository } from "../repositories/operating-hours-repository.js";
import type { RestaurantsRepository } from "../repositories/restaurants-repository.js";

export class GetOperatingHoursUseCase {
  constructor(private readonly restaurants: RestaurantsRepository, private readonly operatingHours: OperatingHoursRepository) {}
  async execute(restaurantId: string) {
    if (!await this.restaurants.findById(restaurantId)) throw new RestaurantNotFoundError();
    return operatingHoursView(await this.operatingHours.findByRestaurantId(restaurantId));
  }
}

export class UpdateOperatingHoursUseCase {
  constructor(private readonly restaurants: RestaurantsRepository, private readonly operatingHours: OperatingHoursRepository) {}
  async execute(restaurantId: string, days: OperatingHourInput[]) {
    if (!await this.restaurants.findById(restaurantId)) throw new RestaurantNotFoundError();
    return operatingHoursView(await this.operatingHours.replaceWeek(restaurantId, days));
  }
}
