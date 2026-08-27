import { DeliveryNotFoundError } from "../errors/delivery-not-found-error.js";
import { DeliveryTransactionManager } from "../repositories/delivery-transaction-manager.js";
import { InvalidDeliveryStatusTransitionError } from "../errors/invalid-delivery-status-transition-error.js";
import { InvalidOrderStatusTransitionError } from "../errors/invalid-order-status-transition-error.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";

interface CompleteDeliveryRequest {
  restaurantId: string;
  orderId: string;
}

export class CompleteDeliveryUseCase {
  constructor(
    private readonly transactionManager: DeliveryTransactionManager,
  ) {}

  async execute(request: CompleteDeliveryRequest) {
    return await this.transactionManager.transaction(
      async ({
        ordersRepository,
        deliveriesRepository,
        orderHistoryRepository,
        deliveryHistoryRepository,
      }) => {
        const order =
          await ordersRepository.findByIdAndRestaurantIdForUpdate(
            request.orderId,
            request.restaurantId,
          );
        if (!order) throw new OrderNotFoundError();

        const delivery = await deliveriesRepository.findByOrderIdForUpdate(
          request.orderId,
        );
        if (!delivery) throw new DeliveryNotFoundError();

        if (delivery.status !== "OUT_FOR_DELIVERY") {
          throw new InvalidDeliveryStatusTransitionError(
            delivery.status,
            "DELIVERED",
          );
        }

        if (order.status !== "OUT_FOR_DELIVERY") {
          throw new InvalidOrderStatusTransitionError(
            order.status,
            "DELIVERED",
          );
        }

        await deliveriesRepository.updateStatus(delivery.id, "DELIVERED");
        await ordersRepository.updateStatus(order.id, "DELIVERED");

        await deliveryHistoryRepository.create({
          deliveryId: delivery.id,
          action: "DELIVERY_COMPLETED",
          previousStatus: "OUT_FOR_DELIVERY",
          newStatus: "DELIVERED",
        });

        await orderHistoryRepository.create({
          orderId: order.id,
          action: "STATUS_CHANGED",
          previousStatus: "OUT_FOR_DELIVERY",
          newStatus: "DELIVERED",
          observation: "Entrega concluída.",
        });
      },
    );
  }
}
