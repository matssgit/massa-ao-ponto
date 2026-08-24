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

export interface GetCategoryPerformanceFilters {
  restaurantId: string;
  startsAt?: Date;
  endsAt?: Date;
  limit: number;
}

export interface CategoryPerformanceMetrics {
  categoryId: string;
  categoryName: string;
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

export interface OrdersAnalyticsRepository {
  getSalesSummary(
    filters: GetSalesSummaryFilters,
  ): Promise<SalesSummaryMetrics>;
  getTopProducts(filters: GetTopProductsFilters): Promise<TopProductMetrics[]>;
  getCategoryPerformance(
    filters: GetCategoryPerformanceFilters,
  ): Promise<CategoryPerformanceMetrics[]>;
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

export interface GetCategoryPerformanceFilters {
  restaurantId: string;
  startsAt?: Date;
  endsAt?: Date;
  limit: number;
}

export interface CategoryPerformanceMetrics {
  categoryId: string;
  categoryName: string;
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

export interface GetTopCustomersFilters {
  restaurantId: string;
  startsAt?: Date;
  endsAt?: Date;
  limit: number;
}

export interface TopCustomerMetrics {
  customerId: string;
  customerName: string;
  ordersCount: number;
  totalSpent: number;
  averageTicket: number;
}

export interface OrdersAnalyticsRepository {
  getSalesSummary(
    filters: GetSalesSummaryFilters,
  ): Promise<SalesSummaryMetrics>;
  getTopProducts(filters: GetTopProductsFilters): Promise<TopProductMetrics[]>;
  getCategoryPerformance(
    filters: GetCategoryPerformanceFilters,
  ): Promise<CategoryPerformanceMetrics[]>;
  getTopCustomers(
    filters: GetTopCustomersFilters,
  ): Promise<TopCustomerMetrics[]>;
}
