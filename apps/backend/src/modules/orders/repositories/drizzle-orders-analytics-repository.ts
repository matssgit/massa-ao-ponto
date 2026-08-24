import { GetSalesSummaryFilters, GetTopProductsFilters, OrdersAnalyticsRepository, SalesSummaryMetrics, TopProductMetrics } from './orders-analytics-repository.js';
import { and, asc, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { orderItems, orders } from '../../../db/schema/index.js';

import { db } from '../../../db/index.js';

export class DrizzleOrdersAnalyticsRepository implements OrdersAnalyticsRepository {
  constructor(private readonly client: any = db) {}

  async getSalesSummary(filters: GetSalesSummaryFilters): Promise<SalesSummaryMetrics> {
    const conditions = [eq(orders.restaurantId, filters.restaurantId)];
    
    if (filters.startsAt) conditions.push(gte(orders.createdAt, filters.startsAt));
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

  async getTopProducts(filters: GetTopProductsFilters): Promise<TopProductMetrics[]> {
    const conditions = [
      eq(orders.restaurantId, filters.restaurantId),
      ne(orders.status, 'CANCELLED')
    ];

    if (filters.startsAt) conditions.push(gte(orders.createdAt, filters.startsAt));
    if (filters.endsAt) conditions.push(lte(orders.createdAt, filters.endsAt));

    // A agregação é enviada integralmente ao PostgreSQL, agrupando pelo snapshot
    // persistido no pedido, garantindo performance e isolando alterações futuras do catálogo.
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
        asc(orderItems.productId)
      )
      .limit(filters.limit);
  }
}