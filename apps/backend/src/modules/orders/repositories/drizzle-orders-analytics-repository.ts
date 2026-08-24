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
import { and, asc, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import {
  customers,
  orderItems,
  orders,
  productCategories,
  products,
} from "../../../db/schema/index.js";

import { db } from "../../../db/index.js";

export class DrizzleOrdersAnalyticsRepository implements OrdersAnalyticsRepository {
  constructor(private readonly client: any = db) {}

  async getSalesSummary(
    filters: GetSalesSummaryFilters,
  ): Promise<SalesSummaryMetrics> {
    const conditions = [eq(orders.restaurantId, filters.restaurantId)];

    if (filters.startsAt)
      conditions.push(gte(orders.createdAt, filters.startsAt));
    if (filters.endsAt) conditions.push(lte(orders.createdAt, filters.endsAt));

    const [result] = await this.client
      .select({
        total: sql<number>`cast(count(${orders.id}) as integer)`,
        delivered: sql<number>`cast(count(${orders.id}) filter (where ${orders.status} = 'DELIVERED') as integer)`,
        cancelled: sql<number>`cast(count(${orders.id}) filter (where ${orders.status} = 'CANCELLED') as integer)`,
        pending: sql<number>`cast(count(${orders.id}) filter (where ${orders.status} = 'PENDING') as integer)`,
        gross: sql<number>`cast(coalesce(sum(${orders.total}) filter (where ${orders.status} != 'CANCELLED'), 0) as integer)`,
        paid: sql<number>`cast(coalesce(sum(${orders.total}) filter (where ${orders.status} != 'CANCELLED' and ${orders.paymentStatus} = 'PAID'), 0) as integer)`,
      })
      .from(orders)
      .where(and(...conditions));

    return result;
  }

  async getTopProducts(
    filters: GetTopProductsFilters,
  ): Promise<TopProductMetrics[]> {
    const conditions = [
      eq(orders.restaurantId, filters.restaurantId),
      ne(orders.status, "CANCELLED"),
    ];

    if (filters.startsAt)
      conditions.push(gte(orders.createdAt, filters.startsAt));
    if (filters.endsAt) conditions.push(lte(orders.createdAt, filters.endsAt));

    return await this.client
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        quantitySold: sql<number>`cast(sum(${orderItems.quantity}) as integer)`,
        revenue: sql<number>`cast(sum(${orderItems.subtotal}) as integer)`,
        orderCount: sql<number>`cast(count(distinct ${orders.id}) as integer)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(...conditions))
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(
        desc(sql<number>`sum(${orderItems.subtotal})`),
        desc(sql<number>`sum(${orderItems.quantity})`),
        asc(orderItems.productId),
      )
      .limit(filters.limit);
  }

  async getCategoryPerformance(
    filters: GetCategoryPerformanceFilters,
  ): Promise<CategoryPerformanceMetrics[]> {
    const conditions = [
      eq(orders.restaurantId, filters.restaurantId),
      eq(productCategories.restaurantId, filters.restaurantId),
      ne(orders.status, "CANCELLED"),
    ];

    if (filters.startsAt)
      conditions.push(gte(orders.createdAt, filters.startsAt));
    if (filters.endsAt) conditions.push(lte(orders.createdAt, filters.endsAt));

    return await this.client
      .select({
        categoryId: productCategories.id,
        categoryName: productCategories.name,
        quantitySold: sql<number>`cast(coalesce(sum(${orderItems.quantity}), 0) as integer)`,
        revenue: sql<number>`cast(coalesce(sum(${orderItems.subtotal}), 0) as integer)`,
        orderCount: sql<number>`cast(count(distinct ${orders.id}) as integer)`,
      })
      .from(productCategories)
      .innerJoin(products, eq(productCategories.id, products.categoryId))
      .innerJoin(orderItems, eq(products.id, orderItems.productId))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(...conditions))
      .groupBy(productCategories.id, productCategories.name)
      .orderBy(
        desc(sql<number>`sum(${orderItems.subtotal})`),
        desc(sql<number>`sum(${orderItems.quantity})`),
        asc(productCategories.id),
      )
      .limit(filters.limit);
  }

  async getTopCustomers(
    filters: GetTopCustomersFilters,
  ): Promise<TopCustomerMetrics[]> {
    const conditions = [
      eq(orders.restaurantId, filters.restaurantId),
      ne(orders.status, "CANCELLED"),
    ];

    if (filters.startsAt)
      conditions.push(gte(orders.createdAt, filters.startsAt));
    if (filters.endsAt) conditions.push(lte(orders.createdAt, filters.endsAt));

    const result = await this.client
      .select({
        customerId: orders.customerId,
        customerName: customers.name,
        ordersCount: sql<number>`cast(count(${orders.id}) as integer)`,
        totalSpent: sql<number>`cast(coalesce(sum(${orders.total}), 0) as integer)`,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(and(...conditions))
      .groupBy(orders.customerId, customers.name)
      .orderBy(
        desc(sql<number>`sum(${orders.total})`),
        desc(sql<number>`count(${orders.id})`),
        asc(orders.customerId),
      )
      .limit(filters.limit);

    return result.map((row: any) => ({
      ...row,
      averageTicket: Math.floor(row.totalSpent / row.ordersCount),
    }));
  }
}
