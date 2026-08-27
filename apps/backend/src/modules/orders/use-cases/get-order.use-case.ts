import { OrderItemsRepository } from "../repositories/order-items-repository.js";
import { OrderHistoryRepository } from "../repositories/order-history-repository.js";
import { DeliveriesRepository } from "../repositories/deliveries-repository.js";
import { DeliveryHistoryRepository } from "../repositories/delivery-history-repository.js";
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
    private readonly deliveriesRepository: DeliveriesRepository,
    private readonly deliveryHistoryRepository: DeliveryHistoryRepository,
  ) {}

  async execute({ restaurantId, orderId }: GetOrderRequest) {
    const order = await this.ordersRepository.findByIdAndRestaurantId(
      orderId,
      restaurantId,
    );

    if (!order) {
      throw new OrderNotFoundError();
    }

    const [items, history, delivery] = await Promise.all([
      this.orderItemsRepository.findManyByOrderIds([order.id]),
      this.orderHistoryRepository.findManyByOrderId(order.id),
      order.type === "DELIVERY"
        ? this.deliveriesRepository.findByOrderId(order.id)
        : Promise.resolve(null),
    ]);

    if (!delivery) {
      return {
        order,
        items,
        history,
        delivery: null,
      };
    }

    const deliveryHistory =
      await this.deliveryHistoryRepository.findManyByDeliveryId(delivery.id);

    return {
      order,
      items,
      history,
      delivery: {
        ...delivery,
        history: deliveryHistory,
      },
    };
  }
}
