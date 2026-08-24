export interface GetSalesSummaryFilters {
  restaurantId: string;
  startsAt?: Date;
  endsAt?: Date;
}

export interface SalesSummaryMetrics {
  total: number;
  delivered: number;
  cancelled: number;
  pending: number;
  gross: number;
  paid: number;
}

export interface OrdersAnalyticsRepository {
  getSalesSummary(
    filters: GetSalesSummaryFilters,
  ): Promise<SalesSummaryMetrics>;
}
