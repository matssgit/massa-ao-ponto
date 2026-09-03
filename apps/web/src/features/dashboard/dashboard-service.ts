import { z } from "zod";
import { ApiClient, ApiError } from "../../lib/api-client";
import type { DashboardPeriod } from "./period";

const count = z.number().int().nonnegative();
const summarySchema = z.object({
  period: z.object({ startsAt: z.string().nullable(), endsAt: z.string().nullable() }),
  orders: z.object({ total: count, delivered: count, cancelled: count, pending: count, paid: count }),
  revenue: count,
  averageTicket: count,
});
const productsSchema = z.array(z.object({
  productId: z.uuid(), productName: z.string(), quantitySold: count, revenue: count, orderCount: count,
}));
const customersSchema = z.array(z.object({
  customerId: z.uuid(), customerName: z.string(), ordersCount: count,
  paidOrdersCount: count, totalSpent: count, averageTicket: count,
}));
const categoriesSchema = z.array(z.object({
  categoryId: z.uuid(), categoryName: z.string(), quantitySold: count, revenue: count, orderCount: count,
}));
export type SalesSummary = z.infer<typeof summarySchema>;
export type TopProduct = z.infer<typeof productsSchema>[number];
export type TopCustomer = z.infer<typeof customersSchema>[number];
export type CategoryPerformance = z.infer<typeof categoriesSchema>[number];

export class DashboardService {
  constructor(private readonly client: ApiClient) {}

  private async read<T>(restaurantId: string, endpoint: string, period: DashboardPeriod, schema: z.ZodType<T>, signal?: AbortSignal, ranking = false): Promise<T> {
    const query = new URLSearchParams({ startsAt: period.startsAt, endsAt: period.endsAt });
    if (ranking) query.set("limit", "5");
    const payload = await this.client.request(`/restaurants/${encodeURIComponent(restaurantId)}/dashboard/${endpoint}?${query}`, { signal });
    const result = schema.safeParse(payload);
    if (!result.success) throw new ApiError(200, "INVALID_RESPONSE", "O relatório retornou dados em formato inesperado.");
    return result.data;
  }

  summary(id: string, period: DashboardPeriod, signal?: AbortSignal) { return this.read(id, "sales-summary", period, summarySchema, signal); }
  products(id: string, period: DashboardPeriod, signal?: AbortSignal) { return this.read(id, "top-products", period, productsSchema, signal, true); }
  customers(id: string, period: DashboardPeriod, signal?: AbortSignal) { return this.read(id, "top-customers", period, customersSchema, signal, true); }
  categories(id: string, period: DashboardPeriod, signal?: AbortSignal) { return this.read(id, "category-performance", period, categoriesSchema, signal, true); }
}
