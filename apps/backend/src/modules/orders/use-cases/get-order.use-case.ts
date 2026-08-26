import { OrderItemsRepository } from "../repositories/order-items-repository.js";
import { OrderHistoryRepository } from "../repositories/order-history-repository.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
import { OrdersRepository } from "../repositories/orders-repository.js";

interface GetOrderRequest {
  restaurantId: string;
  orderId: string;
}

export class GetOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderItemsRepository: OrderItemsRepository,
    private readonly orderHistoryRepository: OrderHistoryRepository,
  ) {}

  async execute({ restaurantId, orderId }: GetOrderRequest) {
    const order = await this.ordersRepository.findByIdAndRestaurantId(
      orderId,
      restaurantId,
    );

    if (!order) {
      throw new OrderNotFoundError();
    }

    const [items, history] = await Promise.all([
      this.orderItemsRepository.findManyByOrderIds([order.id]),
      this.orderHistoryRepository.findManyByOrderId(order.id),
    ]);

    return {
      order,
      items,
      history,
    };
  }
}
