import { z } from "zod";
import { ApiClient, ApiError } from "../../lib/api-client";

export const orderStatusSchema = z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]);
export const orderTypeSchema = z.enum(["DELIVERY", "PICKUP", "DINE_IN"]);
const cents = z.number().int().nonnegative();
const timestamp = z.iso.datetime({ offset: true });
export const orderSchema = z.object({
  id: z.uuid(), restaurantId: z.uuid(), customerId: z.uuid(), tableId: z.uuid().nullish(),
  type: orderTypeSchema, status: orderStatusSchema, paymentStatus: z.enum(["PENDING", "PAID"]),
  subtotal: cents, deliveryFee: cents, total: cents,
  customerName: z.string(), customerPhone: z.string(),
  deliveryStreet: z.string().nullable(), deliveryNumber: z.string().nullable(),
  deliveryComplement: z.string().nullable(), deliveryNeighborhood: z.string().nullable(),
  deliveryCity: z.string().nullable(), deliveryState: z.string().nullable(), deliveryZipCode: z.string().nullable(),
  observation: z.string().nullable(), createdAt: timestamp, updatedAt: timestamp,
});
const addonSchema = z.object({
  id: z.uuid(), addonId: z.uuid(), addonName: z.string(),
  unitPrice: cents, quantity: z.number().int().positive(), subtotal: cents, createdAt: timestamp,
});
const itemSchema = z.object({
  id: z.uuid(), orderId: z.uuid(), productId: z.uuid(), productName: z.string(),
  unitPrice: cents, quantity: z.number().int().positive(), subtotal: cents, createdAt: timestamp,
  // GetOrder pode omitir a coleção vazia; ListOrders sempre a inclui.
  addons: z.array(addonSchema).default([]),
});
const historySchema = z.object({
  id: z.uuid(), action: z.string(), previousStatus: z.string().nullable(),
  newStatus: z.string(), observation: z.string().nullable(), createdAt: timestamp,
});
export const deliverySchema = z.object({
  id: z.uuid(), orderId: z.uuid(),
  status: z.enum(["PENDING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
  createdAt: timestamp, updatedAt: timestamp,
});
export const orderDetailsSchema = z.object({
  order: orderSchema, items: z.array(itemSchema), history: z.array(historySchema),
  delivery: deliverySchema.extend({ history: z.array(historySchema) }).nullable(),
});
export const ordersListSchema = z.object({
  data: z.array(z.object({ order: orderSchema, items: z.array(itemSchema) })),
  meta: z.object({
    page: z.number().int().positive(), limit: z.number().int().min(1).max(100),
    total: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
    hasNext: z.boolean(), hasPrevious: z.boolean(),
  }),
});
export type Order = z.infer<typeof orderSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type OrderType = z.infer<typeof orderTypeSchema>;
export type OrderDetail = z.infer<typeof orderDetailsSchema>;
export type OrdersList = z.infer<typeof ordersListSchema>;
export type HistoryEntry = z.infer<typeof historySchema>;
export interface OrdersFiltersValue {
  status?: OrderStatus;
  type?: OrderType;
  customerId?: string;
  startsAt?: string;
  endsAt?: string;
  page: number;
  limit: number;
}
export type OrderAction =
  | { kind: "status"; status: OrderStatus }
  | { kind: "cancel" | "payment" | "create-delivery" | "start-delivery" | "complete-delivery" };

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(200, "INVALID_RESPONSE", "A API retornou dados de pedido em formato inesperado.");
  return result.data;
}

export class OrdersService {
  constructor(private readonly client: ApiClient) {}

  private path(restaurantId: string, orderId?: string) {
    return `/restaurants/${encodeURIComponent(restaurantId)}/orders${orderId ? `/${encodeURIComponent(orderId)}` : ""}`;
  }

  async list(restaurantId: string, filters: OrdersFiltersValue, signal?: AbortSignal) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "") query.set(key, String(value));
    }
    return parse(ordersListSchema, await this.client.request(`${this.path(restaurantId)}?${query}`, { signal }));
  }

  async detail(restaurantId: string, orderId: string, signal?: AbortSignal) {
    return parse(orderDetailsSchema, await this.client.request(this.path(restaurantId, orderId), { signal }));
  }

  async mutate(restaurantId: string, orderId: string, action: OrderAction): Promise<void> {
    const root = this.path(restaurantId, orderId);
    switch (action.kind) {
      case "status":
        parse(z.undefined(), await this.client.request(`${root}/status`, { method: "PATCH", body: { status: action.status } }));
        return;
      case "cancel":
        parse(z.object({ status: z.literal("CANCELLED") }), await this.client.request(`${root}/cancel`, { method: "PATCH" }));
        return;
      case "payment":
        parse(orderSchema, await this.client.request(`${root}/payment`, { method: "PATCH" }));
        return;
      case "create-delivery":
        parse(deliverySchema, await this.client.request(`${root}/delivery`, { method: "POST" }));
        return;
      case "start-delivery":
        parse(z.undefined(), await this.client.request(`${root}/delivery/start`, { method: "PATCH" }));
        return;
      case "complete-delivery":
        parse(z.undefined(), await this.client.request(`${root}/delivery/complete`, { method: "PATCH" }));
    }
  }
}
