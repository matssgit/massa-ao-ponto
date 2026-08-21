import { InvalidOrderStatusTransitionError } from "../errors/invalid-order-status-transition-error.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
import { OrderTransactionManager } from "../repositories/order-transaction-manager.js";

interface UpdateOrderStatusRequest {
  orderId: string;
  status: string;
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export class UpdateOrderStatusUseCase {
  constructor(private readonly transactionManager: OrderTransactionManager) {}

  async execute(request: UpdateOrderStatusRequest) {
    return await this.transactionManager.transaction(
      async ({ ordersRepository, orderHistoryRepository }) => {
        const order = await ordersRepository.findByIdForUpdate(request.orderId);
        if (!order) {
          throw new OrderNotFoundError();
        }

        const allowedNextStates = ALLOWED_TRANSITIONS[order.status] || [];
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
