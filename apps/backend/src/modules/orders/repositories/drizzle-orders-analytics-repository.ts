import {
  GetSalesSummaryFilters,
  OrdersAnalyticsRepository,
  SalesSummaryMetrics,
} from "./orders-analytics-repository.js";
import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { orders } from "../../../db/schema/index.js";

export class DrizzleOrdersAnalyticsRepository implements OrdersAnalyticsRepository {
  constructor(private readonly client: any = db) {}

  async getSalesSummary(
    filters: GetSalesSummaryFilters,
  ): Promise<SalesSummaryMetrics> {
    const conditions = [eq(orders.restaurantId, filters.restaurantId)];

    if (filters.startsAt)
      conditions.push(gte(orders.createdAt, filters.startsAt));
    if (filters.endsAt) conditions.push(lte(orders.createdAt, filters.endsAt));

    // A agregação permanece no PostgreSQL para evitar transferir potencialmente milhares
    // de pedidos para o Node apenas para executar operações em memória de COUNT/SUM.
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
}
