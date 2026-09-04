import { z } from "zod";
import { ApiClient, ApiError } from "../../lib/api-client";

export const customerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
});

export const customersListSchema = z.object({
  data: z.array(customerSchema),
  meta: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
});

export type Customer = z.infer<typeof customerSchema>;
export type CustomersList = z.infer<typeof customersListSchema>;
export interface CustomerFilters { search?: string; page: number; limit: number }

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(200, "INVALID_RESPONSE", "A API retornou dados de cliente em formato inesperado.");
  return result.data;
}

export class CustomersService {
  constructor(private readonly client: ApiClient) {}

  private root(restaurantId: string, customerId?: string) {
    const root = `/restaurants/${encodeURIComponent(restaurantId)}/customers`;
    return customerId ? `${root}/${encodeURIComponent(customerId)}` : root;
  }

  async list(restaurantId: string, filters: CustomerFilters, signal?: AbortSignal) {
    const query = new URLSearchParams({ page: String(filters.page), limit: String(filters.limit) });
    if (filters.search) query.set("search", filters.search);
    return parse(customersListSchema, await this.client.request(`${this.root(restaurantId)}?${query}`, { signal }));
  }

  async detail(restaurantId: string, customerId: string, signal?: AbortSignal) {
    return parse(customerSchema, await this.client.request(this.root(restaurantId, customerId), { signal }));
  }
}
