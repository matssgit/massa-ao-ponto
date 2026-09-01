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
  paidOrders: number;
  revenue: number;
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
  paidOrdersCount: number;
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
