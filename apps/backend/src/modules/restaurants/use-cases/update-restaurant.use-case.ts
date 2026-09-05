import {
  RestaurantsRepository,
  UpdateRestaurantInput,
} from "../repositories/restaurants-repository.js";

import { InvalidRestaurantPublicConfigError } from "../errors/invalid-restaurant-public-config-error.js";
import { RestaurantNotFoundError } from "../errors/restaurant-not-found-error.js";
import { RestaurantSlugConflictError } from "../errors/restaurant-slug-conflict-error.js";
import { normalizeRestaurantSlug } from "../restaurant-slug.js";

interface UpdateRestaurantRequest extends UpdateRestaurantInput {
  restaurantId: string;
}

export class UpdateRestaurantUseCase {
  constructor(
    private readonly restaurantsRepository: RestaurantsRepository,
  ) {}

  async execute({ restaurantId, ...data }: UpdateRestaurantRequest) {
    const restaurant = await this.restaurantsRepository.findById(restaurantId);
    if (!restaurant) throw new RestaurantNotFoundError();

    const normalizedSlug = typeof data.slug === "string"
      ? normalizeRestaurantSlug(data.slug)
      : data.slug;
    if (normalizedSlug === "") throw new InvalidRestaurantPublicConfigError();

    const nextSlug = normalizedSlug === undefined ? restaurant.slug : normalizedSlug;
    const nextPublicEnabled = data.publicEnabled ?? restaurant.publicEnabled;
    if (nextPublicEnabled && !nextSlug) throw new InvalidRestaurantPublicConfigError();

    if (nextSlug) {
      const existing = await this.restaurantsRepository.findBySlug(nextSlug);
      if (existing && existing.id !== restaurantId) throw new RestaurantSlugConflictError();
    }

    const changes: UpdateRestaurantInput = {
      ...data,
      ...(normalizedSlug === undefined ? {} : { slug: normalizedSlug }),
    };
    if (Object.keys(changes).length === 0) return restaurant;

    const updatedRestaurant = await this.restaurantsRepository.update(restaurantId, changes);
    if (!updatedRestaurant) throw new RestaurantNotFoundError();
    return updatedRestaurant;
  }
}