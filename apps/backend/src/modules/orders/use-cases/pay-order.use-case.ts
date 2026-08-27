import { InvalidOrderPaymentTransitionError } from "../errors/invalid-order-payment-transition-error.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
import { OrderTransactionManager } from "../repositories/order-transaction-manager.js";

interface PayOrderRequest {
  restaurantId: string;
  orderId: string;
}

export class PayOrderUseCase {
  constructor(private readonly transactionManager: OrderTransactionManager) {}

  async execute(request: PayOrderRequest) {
    return await this.transactionManager.transaction(
      async ({ ordersRepository, orderHistoryRepository }) => {
        const order =
          await ordersRepository.findByIdAndRestaurantIdForUpdate(
            request.orderId,
            request.restaurantId,
          );

        if (!order) {
          throw new OrderNotFoundError();
        }

        if (order.paymentStatus === "PAID") {
          throw new InvalidOrderPaymentTransitionError(
            "O pedido já está pago.",
          );
        }

        if (order.status === "CANCELLED" || order.status === "DELIVERED") {
          throw new InvalidOrderPaymentTransitionError(
            `O pedido está com status operacional ${order.status}.`,
          );
        }

        await ordersRepository.updatePaymentStatus(order.id, "PAID");

        await orderHistoryRepository.create({
          orderId: order.id,
          action: "PAYMENT_CONFIRMED",
          previousStatus: order.status,
          newStatus: order.status,
          observation: null,
        });

        return {
          ...order,
          paymentStatus: "PAID",
          updatedAt: new Date(),
        };
      },
    );
  }
}
