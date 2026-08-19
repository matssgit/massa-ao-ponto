import { InvalidTimeRangeError } from "../errors/invalid-time-range-error.js";
import { ReservationsRepository } from "../repositories/reservations-repository.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import { TablesRepository } from "../../tables/repositories/tables-repository.js";

interface GetAvailabilityRequest {
  restaurantId: string;
  startsAt: Date;
  endsAt: Date;
  people?: number;
}

export class GetAvailabilityUseCase {
  constructor(
    private readonly restaurantsRepository: RestaurantsRepository,
    private readonly tablesRepository: TablesRepository,
    private readonly reservationsRepository: ReservationsRepository,
  ) {}

  async execute(request: GetAvailabilityRequest) {
    if (request.startsAt >= request.endsAt) {
      throw new InvalidTimeRangeError();
    }

    const restaurant = await this.restaurantsRepository.findById(
      request.restaurantId,
    );
    if (!restaurant) {
      throw new RestaurantNotFoundError();
    }

    const activeTables =
      await this.tablesRepository.findManyActiveByRestaurantId(
        request.restaurantId,
        request.people,
      );

    if (activeTables.length === 0) {
      return [];
    }

    const conflictingTableIds =
      await this.reservationsRepository.findConflictingTableIds(
        request.restaurantId,
        request.startsAt,
        request.endsAt,
      );

    const conflictingSet = new Set(conflictingTableIds);

    return activeTables.filter((table) => !conflictingSet.has(table.id));
  }
}
