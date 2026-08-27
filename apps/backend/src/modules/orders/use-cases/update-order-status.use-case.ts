import { InvalidOrderStatusTransitionError } from "../errors/invalid-order-status-transition-error.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
import {
  OrderStatus,
  OrderType,
} from "../repositories/orders-repository.js";
import { OrderTransactionManager } from "../repositories/order-transaction-manager.js";

interface UpdateOrderStatusRequest {
  orderId: string;
  status: OrderStatus;
}

function getAllowedTransitions(
  orderType: OrderType,
  currentStatus: OrderStatus,
): OrderStatus[] {
  if (currentStatus === "PENDING") return ["CONFIRMED"];
  if (currentStatus === "CONFIRMED") return ["PREPARING"];
  if (currentStatus === "PREPARING") return ["READY"];

  if (
    currentStatus === "READY" &&
    (orderType === "PICKUP" || orderType === "DINE_IN")
  ) {
    return ["DELIVERED"];
  }

  return [];
}

export class UpdateOrderStatusUseCase {
  constructor(private readonly transactionManager: OrderTransactionManager) {}

  async execute(request: UpdateOrderStatusRequest) {
    return await this.transactionManager.transaction(
      async ({ ordersRepository, orderHistoryRepository }) => {
        const order = await ordersRepository.findByIdForUpdate(request.orderId);
        if (!order) {
          throw new OrderNotFoundError();
        }

        const allowedNextStates = getAllowedTransitions(
          order.type,
          order.status,
        );
        if (!allowedNextStates.includes(request.status)) {
          throw new InvalidOrderStatusTransitionError(
            order.status,
            request.status,
          );
        }

        const previousStatus = order.status;

        await ordersRepository.updateStatus(order.id, request.status);

        await orderHistoryRepository.create({
          orderId: order.id,
          action: "STATUS_CHANGED",
          previousStatus: previousStatus,
          newStatus: request.status,
          observation: null,
        });
      },
    );
  }
}
