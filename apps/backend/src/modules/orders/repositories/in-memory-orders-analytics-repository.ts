import {
  CategoryPerformanceMetrics,
  GetCategoryPerformanceFilters,
  GetSalesSummaryFilters,
  GetTopCustomersFilters,
  GetTopProductsFilters,
  OrdersAnalyticsRepository,
  SalesSummaryMetrics,
  TopCustomerMetrics,
  TopProductMetrics,
} from "./orders-analytics-repository.js";

import { InMemoryCustomersRepository } from "../../reservations/repositories/in-memory-customers-repository.js";
import { InMemoryOrderItemsRepository } from "./in-memory-order-items-repository.js";
import { InMemoryOrdersRepository } from "./in-memory-orders-repository.js";
import { InMemoryProductCategoriesRepository } from "../../products/repositories/in-memory-product-categories-repository.js";
import { InMemoryProductsRepository } from "../../products/repositories/in-memory-products-repository.js";

export class InMemoryOrdersAnalyticsRepository implements OrdersAnalyticsRepository {
  constructor(
    private readonly ordersRepository: InMemoryOrdersRepository,
    private readonly orderItemsRepository: InMemoryOrderItemsRepository,
    private readonly productsRepository: InMemoryProductsRepository,
    private readonly productCategoriesRepository: InMemoryProductCategoriesRepository,
    private readonly customersRepository: InMemoryCustomersRepository,
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

        if (
          order.status !== "CANCELLED" &&
          order.paymentStatus === "PAID"
        ) {
          acc.paidOrders += 1;
          acc.revenue += order.total;
        }
        return acc;
      },
      {
        total: 0,
        delivered: 0,
        cancelled: 0,
        pending: 0,
        paidOrders: 0,
        revenue: 0,
      },
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
    const paidOrderIds = new Set(
      validOrders
        .filter((order) => order.paymentStatus === "PAID")
        .map((order) => order.id),
    );
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
      if (paidOrderIds.has(item.orderId)) metric.revenue += item.subtotal;
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

  async getCategoryPerformance(
    filters: GetCategoryPerformanceFilters,
  ): Promise<CategoryPerformanceMetrics[]> {
    const validOrders = this.ordersRepository.items.filter((order) => {
      if (order.restaurantId !== filters.restaurantId) return false;
      if (order.status === "CANCELLED") return false;
      if (filters.startsAt && order.createdAt < filters.startsAt) return false;
      if (filters.endsAt && order.createdAt > filters.endsAt) return false;
      return true;
    });

    const validOrderIds = new Set(validOrders.map((o) => o.id));
    const paidOrderIds = new Set(
      validOrders
        .filter((order) => order.paymentStatus === "PAID")
        .map((order) => order.id),
    );
    const categoriesMap = new Map<string, CategoryPerformanceMetrics>();

    for (const item of this.orderItemsRepository.items) {
      if (!validOrderIds.has(item.orderId)) continue;

      const product = this.productsRepository.items.find(
        (p) => p.id === item.productId,
      );
      if (!product) continue;

      const category = this.productCategoriesRepository.items.find(
        (c) => c.id === product.categoryId,
      );
      if (!category || category.restaurantId !== filters.restaurantId) continue;

      if (!categoriesMap.has(category.id)) {
        categoriesMap.set(category.id, {
          categoryId: category.id,
          categoryName: category.name,
          quantitySold: 0,
          revenue: 0,
          orderCount: 0,
        });
      }

      const metric = categoriesMap.get(category.id)!;
      metric.quantitySold += item.quantity;
      if (paidOrderIds.has(item.orderId)) metric.revenue += item.subtotal;
    }

    for (const metric of categoriesMap.values()) {
      const ordersWithCategory = this.orderItemsRepository.items
        .filter((item) => {
          if (!validOrderIds.has(item.orderId)) return false;
          const prod = this.productsRepository.items.find(
            (p) => p.id === item.productId,
          );
          return prod?.categoryId === metric.categoryId;
        })
        .map((i) => i.orderId);

      metric.orderCount = new Set(ordersWithCategory).size;
    }

    return Array.from(categoriesMap.values())
      .sort((a, b) => {
        if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        if (b.quantitySold !== a.quantitySold)
          return b.quantitySold - a.quantitySold;
        return a.categoryId.localeCompare(b.categoryId);
      })
      .slice(0, filters.limit);
  }

  async getTopCustomers(
    filters: GetTopCustomersFilters,
  ): Promise<TopCustomerMetrics[]> {
    const validOrders = this.ordersRepository.items.filter((order) => {
      if (order.restaurantId !== filters.restaurantId) return false;
      if (order.status === "CANCELLED") return false;
      if (filters.startsAt && order.createdAt < filters.startsAt) return false;
      if (filters.endsAt && order.createdAt > filters.endsAt) return false;
      return true;
    });

    const customerMap = new Map<string, TopCustomerMetrics>();

    for (const order of validOrders) {
      if (!customerMap.has(order.customerId)) {
        const customer = this.customersRepository.items.find(
          (c) => c.id === order.customerId,
        );
        customerMap.set(order.customerId, {
          customerId: order.customerId,
          customerName: customer?.name ?? "Desconhecido",
          ordersCount: 0,
          paidOrdersCount: 0,
          totalSpent: 0,
          averageTicket: 0,
        });
      }

      const metric = customerMap.get(order.customerId)!;
      metric.ordersCount += 1;
      if (order.paymentStatus === "PAID") {
        metric.paidOrdersCount += 1;
        metric.totalSpent += order.total;
      }
    }

    for (const metric of customerMap.values()) {
      metric.averageTicket =
        metric.paidOrdersCount > 0
          ? Math.floor(metric.totalSpent / metric.paidOrdersCount)
          : 0;
    }

    return Array.from(customerMap.values())
      .sort((a, b) => {
        if (b.totalSpent !== a.totalSpent) return b.totalSpent - a.totalSpent;
        if (b.ordersCount !== a.ordersCount)
          return b.ordersCount - a.ordersCount;
        return a.customerId.localeCompare(b.customerId);
      })
      .slice(0, filters.limit);
  }
}
