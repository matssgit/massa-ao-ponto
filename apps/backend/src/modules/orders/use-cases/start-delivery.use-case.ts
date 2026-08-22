import { DeliveryNotFoundError } from "../errors/delivery-not-found-error.js";
import { DeliveryTransactionManager } from "../repositories/delivery-transaction-manager.js";
import { InvalidDeliveryStatusTransitionError } from "../errors/invalid-delivery-status-transition-error.js";
import { InvalidOrderStatusTransitionError } from "../errors/invalid-order-status-transition-error.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";

interface StartDeliveryRequest {
  orderId: string;
}

export class StartDeliveryUseCase {
  constructor(
    private readonly transactionManager: DeliveryTransactionManager,
  ) {}

  async execute(request: StartDeliveryRequest) {
    return await this.transactionManager.transaction(
      async ({
        ordersRepository,
        deliveriesRepository,
        orderHistoryRepository,
        deliveryHistoryRepository,
      }) => {
        // Locking garante concorrência sem race conditions
        const order = await ordersRepository.findByIdForUpdate(request.orderId);
        if (!order) throw new OrderNotFoundError();

        const delivery = await deliveriesRepository.findByOrderIdForUpdate(
          request.orderId,
        );
        if (!delivery) throw new DeliveryNotFoundError();

        if (delivery.status !== "PENDING") {
          throw new InvalidDeliveryStatusTransitionError(
            delivery.status,
            "OUT_FOR_DELIVERY",
          );
        }

        if (order.status !== "READY") {
          throw new InvalidOrderStatusTransitionError(
            order.status,
            "OUT_FOR_DELIVERY",
          );
        }

        await deliveriesRepository.updateStatus(
          delivery.id,
          "OUT_FOR_DELIVERY",
        );
        await ordersRepository.updateStatus(order.id, "OUT_FOR_DELIVERY");

        await deliveryHistoryRepository.create({
          deliveryId: delivery.id,
          action: "DELIVERY_STARTED",
          previousStatus: "PENDING",
          newStatus: "OUT_FOR_DELIVERY",
        });

        await orderHistoryRepository.create({
          orderId: order.id,
          action: "STATUS_CHANGED",
          previousStatus: "READY",
          newStatus: "OUT_FOR_DELIVERY",
          observation: "Expedição iniciada.",
        });
      },
    );
  }
}
