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

export interface GetTopProductsFilters {
  restaurantId: string;
  startsAt?: Date;
  endsAt?: Date;
  limit: number;
}

export interface TopProductMetrics {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

export interface OrdersAnalyticsRepository {
  getSalesSummary(
    filters: GetSalesSummaryFilters,
  ): Promise<SalesSummaryMetrics>;
  getTopProducts(filters: GetTopProductsFilters): Promise<TopProductMetrics[]>;
}
