import { OrderItemsRepository } from "../repositories/order-items-repository.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
import { OrdersRepository } from "../repositories/orders-repository.js";

export class GetOrderUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderItemsRepository: OrderItemsRepository,
  ) {}

  async execute(orderId: string) {
    const order = await this.ordersRepository.findById(orderId);

    if (!order) {
      throw new OrderNotFoundError();
    }

    const items = await this.orderItemsRepository.findManyByOrderIds([
      order.id,
    ]);

    return {
      order,
      items,
    };
  }
}
