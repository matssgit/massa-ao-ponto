import { RestaurantNotFoundError } from "../errors/restaurant-not-found-error.js";
import { SpecialHourConflictError, SpecialHourNotFoundError } from "../errors/special-hours-errors.js";
import type { RestaurantsRepository } from "../repositories/restaurants-repository.js";
import type { SpecialHourInput, SpecialHoursRepository } from "../repositories/special-hours-repository.js";

async function requireRestaurant(restaurants: RestaurantsRepository, restaurantId: string) {
  if (!await restaurants.findById(restaurantId)) throw new RestaurantNotFoundError();
}
export class ListSpecialHoursUseCase {
  constructor(private readonly restaurants: RestaurantsRepository, private readonly specialHours: SpecialHoursRepository) {}
  async execute(restaurantId: string) { await requireRestaurant(this.restaurants, restaurantId); return this.specialHours.findByRestaurantId(restaurantId); }
}
export class CreateSpecialHourUseCase {
  constructor(private readonly restaurants: RestaurantsRepository, private readonly specialHours: SpecialHoursRepository) {}
  async execute(restaurantId: string, input: SpecialHourInput) {
    await requireRestaurant(this.restaurants, restaurantId);
    if (await this.specialHours.findByRestaurantIdAndDate(restaurantId, input.date)) throw new SpecialHourConflictError();
    return this.specialHours.create(restaurantId, input);
  }
}
export class UpdateSpecialHourUseCase {
  constructor(private readonly restaurants: RestaurantsRepository, private readonly specialHours: SpecialHoursRepository) {}
  async execute(restaurantId: string, id: string, input: SpecialHourInput) {
    await requireRestaurant(this.restaurants, restaurantId);
    const current = await this.specialHours.findByIdAndRestaurantId(id, restaurantId);
    if (!current) throw new SpecialHourNotFoundError();
    const duplicate = await this.specialHours.findByRestaurantIdAndDate(restaurantId, input.date);
    if (duplicate && duplicate.id !== id) throw new SpecialHourConflictError();
    const updated = await this.specialHours.update(id, restaurantId, input);
    if (!updated) throw new SpecialHourNotFoundError();
    return updated;
  }
}
export class DeleteSpecialHourUseCase {
  constructor(private readonly restaurants: RestaurantsRepository, private readonly specialHours: SpecialHoursRepository) {}
  async execute(restaurantId: string, id: string) {
    await requireRestaurant(this.restaurants, restaurantId);
    if (!await this.specialHours.delete(id, restaurantId)) throw new SpecialHourNotFoundError();
  }
}
