import { ApiClient } from "../../lib/api-client";
import { OrdersService, type OrderStatus, type OrdersList } from "../orders/orders-service";

export const kitchenStatuses = ["PENDING", "CONFIRMED", "PREPARING", "READY"] as const;
export type KitchenStatus = typeof kitchenStatuses[number];
export type KitchenOrder = OrdersList["data"][number];

export class KitchenService {
  private readonly orders: OrdersService;
  constructor(client: ApiClient) { this.orders = new OrdersService(client); }
  async list(restaurantId: string, signal?: AbortSignal): Promise<KitchenOrder[]> {
    const groups = await Promise.all(kitchenStatuses.map(async (status) => {
      const entries: KitchenOrder[] = [];
      let page = 1;
      do {
        const result = await this.orders.list(restaurantId, { status, page, limit: 100 }, signal);
        entries.push(...result.data);
        if (!result.meta.hasNext) break;
        page += 1;
      } while (!signal?.aborted);
      return entries;
    }));
    return groups.flat()
      .filter(({ order }) => kitchenStatuses.includes(order.status as KitchenStatus))
      .sort((a, b) => a.order.createdAt.localeCompare(b.order.createdAt) || a.order.id.localeCompare(b.order.id));
  }
  advance(restaurantId: string, orderId: string, status: OrderStatus) {
    return this.orders.mutate(restaurantId, orderId, { kind: "status", status });
  }
}
