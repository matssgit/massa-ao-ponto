import { InvalidPeriodFilterError } from "../errors/invalid-period-filter-error.js";
import { OrdersAnalyticsRepository } from "../repositories/orders-analytics-repository.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";

interface GetCategoryPerformanceRequest {
  restaurantId: string;
  startsAt?: Date;
  endsAt?: Date;
  limit?: number;
}

export class GetCategoryPerformanceUseCase {
  constructor(
    private readonly restaurantsRepository: RestaurantsRepository,
    private readonly ordersAnalyticsRepository: OrdersAnalyticsRepository,
  ) {}

  async execute(request: GetCategoryPerformanceRequest) {
    if (
      request.startsAt &&
      request.endsAt &&
      request.startsAt > request.endsAt
    ) {
      throw new InvalidPeriodFilterError();
    }

    const restaurant = await this.restaurantsRepository.findById(
      request.restaurantId,
    );
    if (!restaurant) throw new RestaurantNotFoundError();

    return await this.ordersAnalyticsRepository.getCategoryPerformance({
      restaurantId: request.restaurantId,
      startsAt: request.startsAt,
      endsAt: request.endsAt,
      limit: request.limit ?? 10,
    });
  }
}
