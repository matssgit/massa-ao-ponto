import {
  GetSalesSummaryFilters,
  GetTopProductsFilters,
  OrdersAnalyticsRepository,
  SalesSummaryMetrics,
  TopProductMetrics,
} from "./orders-analytics-repository.js";

import { InMemoryOrderItemsRepository } from "./in-memory-order-items-repository.js";
import { InMemoryOrdersRepository } from "./in-memory-orders-repository.js";

export class InMemoryOrdersAnalyticsRepository implements OrdersAnalyticsRepository {
  constructor(
    private readonly ordersRepository: InMemoryOrdersRepository,
    private readonly orderItemsRepository: InMemoryOrderItemsRepository,
  ) {}

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
          if (order.paymentStatus === "PAID") acc.paid += order.total;
        }
        return acc;
      },
      { total: 0, delivered: 0, cancelled: 0, pending: 0, gross: 0, paid: 0 },
    );
  }

  async getTopProducts(
    filters: GetTopProductsFilters,
  ): Promise<TopProductMetrics[]> {
    const validOrders = this.ordersRepository.items.filter((order) => {
      if (order.restaurantId !== filters.restaurantId) return false;
      if (order.status === "CANCELLED") return false;
      if (filters.startsAt && order.createdAt < filters.startsAt) return false;
      if (filters.endsAt && order.createdAt > filters.endsAt) return false;
      return true;
    });

    const validOrderIds = new Set(validOrders.map((o) => o.id));
    const itemsMap = new Map<string, TopProductMetrics>();

    for (const item of this.orderItemsRepository.items) {
      if (!validOrderIds.has(item.orderId)) continue;

      if (!itemsMap.has(item.productId)) {
        itemsMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          quantitySold: 0,
          revenue: 0,
          orderCount: 0,
        });
      }

      const metric = itemsMap.get(item.productId)!;
      metric.quantitySold += item.quantity;
      metric.revenue += item.subtotal;
    }

    for (const metric of itemsMap.values()) {
      const ordersWithProduct = this.orderItemsRepository.items
        .filter(
          (i) =>
            i.productId === metric.productId && validOrderIds.has(i.orderId),
        )
        .map((i) => i.orderId);
      metric.orderCount = new Set(ordersWithProduct).size;
    }

    return Array.from(itemsMap.values())
      .sort((a, b) => {
        if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        if (b.quantitySold !== a.quantitySold)
          return b.quantitySold - a.quantitySold;
        return a.productId.localeCompare(b.productId);
      })
      .slice(0, filters.limit);
  }
}
