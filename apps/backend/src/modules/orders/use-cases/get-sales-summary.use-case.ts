import { InvalidPeriodFilterError } from "../errors/invalid-period-filter-error.js";
import { OrdersAnalyticsRepository } from "../repositories/orders-analytics-repository.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";

interface GetSalesSummaryRequest {
  restaurantId: string;
  startsAt?: Date;
  endsAt?: Date;
}

export class GetSalesSummaryUseCase {
  constructor(
    private readonly restaurantsRepository: RestaurantsRepository,
    private readonly ordersAnalyticsRepository: OrdersAnalyticsRepository,
  ) {}

  async execute(request: GetSalesSummaryRequest) {
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

    const metrics = await this.ordersAnalyticsRepository.getSalesSummary({
      restaurantId: request.restaurantId,
      startsAt: request.startsAt,
      endsAt: request.endsAt,
    });

    const validOrdersCount = metrics.total - metrics.cancelled;
    const averageTicket =
      validOrdersCount > 0 ? Math.floor(metrics.gross / validOrdersCount) : 0;

    return {
      period: {
        startsAt: request.startsAt?.toISOString() ?? null,
        endsAt: request.endsAt?.toISOString() ?? null,
      },
      orders: {
        total: metrics.total,
        delivered: metrics.delivered,
        cancelled: metrics.cancelled,
        pending: metrics.pending,
      },
      revenue: {
        gross: metrics.gross,
        paid: metrics.paid,
      },
      averageTicket,
    };
  }
}
