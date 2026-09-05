import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import type { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import type { ReservationsRepository } from "../../reservations/repositories/reservations-repository.js";
import { GetAvailabilityUseCase } from "../../reservations/use-cases/get-availability.use-case.js";
import type { TablesRepository } from "../../tables/repositories/tables-repository.js";

export class GetPublicAvailabilityUseCase {
  constructor(
    private readonly restaurants: RestaurantsRepository,
    private readonly tables: TablesRepository,
    private readonly reservations: ReservationsRepository,
  ) {}

  async execute(input: { slug: string; startsAt: Date; endsAt: Date; partySize?: number }) {
    const restaurant = await this.restaurants.findPublishedBySlug(input.slug);
    if (!restaurant) throw new RestaurantNotFoundError();
    const available = await new GetAvailabilityUseCase(
      this.restaurants,
      this.tables,
      this.reservations,
    ).execute({
      restaurantId: restaurant.id,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      people: input.partySize,
    });
    return available.map((table) => ({
      id: table.id,
      number: table.number,
      capacity: table.capacity,
      type: table.type,
    }));
  }
}