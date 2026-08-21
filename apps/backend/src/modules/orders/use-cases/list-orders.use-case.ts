import {
  ListOrdersFilters,
  OrdersRepository,
} from "../repositories/orders-repository.js";
import {
  OrderItem,
  OrderItemsRepository,
} from "../repositories/order-items-repository.js";

export class ListOrdersUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderItemsRepository: OrderItemsRepository,
  ) {}

  async execute(filters: ListOrdersFilters) {
    const orders = await this.ordersRepository.findMany(filters);

    if (orders.length === 0) {
      return [];
    }

    const orderIds = orders.map((order) => order.id);
    const items = await this.orderItemsRepository.findManyByOrderIds(orderIds);

    // Agrupa em memória (evita N+1 do banco)
    const itemsByOrderId = new Map<string, OrderItem[]>();

    for (const item of items) {
      const orderItemsList = itemsByOrderId.get(item.orderId) || [];
      orderItemsList.push(item);
      itemsByOrderId.set(item.orderId, orderItemsList);
    }

    return orders.map((order) => ({
      order,
      items: itemsByOrderId.get(order.id) || [],
    }));
  }
}
