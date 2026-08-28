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
    const [orders, total] = await Promise.all([
      this.ordersRepository.findMany(filters),
      this.ordersRepository.count(filters),
    ]);
    const itemsByOrderId = new Map<string, OrderItem[]>();

    if (orders.length > 0) {
      const orderIds = orders.map((order) => order.id);
      const items = await this.orderItemsRepository.findManyByOrderIds(orderIds);

      for (const item of items) {
        const orderItemsList = itemsByOrderId.get(item.orderId) || [];
        orderItemsList.push({
          ...item,
          addons: item.addons ?? [],
        });
        itemsByOrderId.set(item.orderId, orderItemsList);
      }
    }

    const totalPages = total === 0 ? 0 : Math.ceil(total / filters.limit);

    return {
      data: orders.map((order) => ({
        order,
        items: itemsByOrderId.get(order.id) || [],
      })),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
        hasNext: filters.page < totalPages,
        hasPrevious: filters.page > 1,
      },
    };
  }
}
