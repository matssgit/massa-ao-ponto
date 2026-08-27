import { InvalidOrderStatusTransitionError } from "../errors/invalid-order-status-transition-error.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
import { OrderTransactionManager } from "../repositories/order-transaction-manager.js";

interface CancelOrderRequest {
  restaurantId: string;
  orderId: string;
}

export class CancelOrderUseCase {
  constructor(private readonly transactionManager: OrderTransactionManager) {}

  async execute(request: CancelOrderRequest) {
    return await this.transactionManager.transaction(
      async ({ ordersRepository, orderHistoryRepository }) => {
        // 1. Busca com Row-Level Locking
        const order =
          await ordersRepository.findByIdAndRestaurantIdForUpdate(
            request.orderId,
            request.restaurantId,
          );

        if (!order) {
          throw new OrderNotFoundError();
        }

        // 2. Validação da Regra de Negócio (Cancelamento restrito a PENDING e CONFIRMED)
        if (order.status !== "PENDING" && order.status !== "CONFIRMED") {
          throw new InvalidOrderStatusTransitionError(
            order.status,
            "CANCELLED",
          );
        }

        const previousStatus = order.status;

        // 3. Atualização Atômica
        await ordersRepository.updateStatus(order.id, "CANCELLED");

        // 4. Registro no Histórico (Append-only)
        await orderHistoryRepository.create({
          orderId: order.id,
          action: "CANCELLED",
          previousStatus: previousStatus,
          newStatus: "CANCELLED",
          observation: "Cancelamento solicitado pelo cliente",
        });
      },
    );
  }
}
