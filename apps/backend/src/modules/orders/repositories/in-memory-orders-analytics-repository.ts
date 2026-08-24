import {
  GetSalesSummaryFilters,
  OrdersAnalyticsRepository,
  SalesSummaryMetrics,
} from "./orders-analytics-repository.js";

import { InMemoryOrdersRepository } from "./in-memory-orders-repository.js";

export class InMemoryOrdersAnalyticsRepository implements OrdersAnalyticsRepository {
  constructor(private readonly ordersRepository: InMemoryOrdersRepository) {}

  async getSalesSummary(
    filters: GetSalesSummaryFilters,
  ): Promise<SalesSummaryMetrics> {
    const relevantOrders = this.ordersRepository.items.filter((order) => {
      if (order.restaurantId !== filters.restaurantId) return false;
      if (filters.startsAt && order.createdAt < filters.startsAt) return false;
      if (filters.endsAt && order.createdAt > filters.endsAt) return false;
      return true;
    });

    return relevantOrders.reduce(
      (acc, order) => {
        acc.total += 1;
        if (order.status === "DELIVERED") acc.delivered += 1;
        if (order.status === "CANCELLED") acc.cancelled += 1;
        if (order.status === "PENDING") acc.pending += 1;

        if (order.status !== "CANCELLED") {
          acc.gross += order.total;
          if (order.paymentStatus === "PAID") {
            acc.paid += order.total;
          }
        }
        return acc;
      },
      { total: 0, delivered: 0, cancelled: 0, pending: 0, gross: 0, paid: 0 },
    );
  }
}
