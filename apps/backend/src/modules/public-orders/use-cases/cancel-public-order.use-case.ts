import { PublicOrderNotFoundError } from "../../orders/errors/public-order-not-found-error.js";
import { hashPublicOrderToken, isPublicOrderToken } from "../../orders/public-order-tokens.js";
import type { OrderItemsRepository } from "../../orders/repositories/order-items-repository.js";
import type { OrdersRepository } from "../../orders/repositories/orders-repository.js";
import type { OrderTransactionManager } from "../../orders/repositories/order-transaction-manager.js";
import { CancelOrderUseCase } from "../../orders/use-cases/cancel-order.use-case.js";
import { publicOrderView } from "../public-order-view.js";
import type { DeliveriesRepository } from "../../orders/repositories/deliveries-repository.js";

export class CancelPublicOrderUseCase {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly orderItems: OrderItemsRepository,
    private readonly transactions: OrderTransactionManager,
    private readonly deliveries: DeliveriesRepository,
  ) {}

  async execute(token: string) {
    if (!isPublicOrderToken(token)) throw new PublicOrderNotFoundError();
    const tokenHash = hashPublicOrderToken(token);
    const order = await this.orders.findByPublicAccessTokenHash(tokenHash);
    if (!order) throw new PublicOrderNotFoundError();
    await new CancelOrderUseCase(this.transactions).execute({
      restaurantId: order.restaurantId,
      orderId: order.id,
    });
    const cancelled = await this.orders.findByPublicAccessTokenHash(tokenHash);
    if (!cancelled) throw new PublicOrderNotFoundError();
    const items = await this.orderItems.findManyByOrderIds([cancelled.id]);
    const delivery = cancelled.type === "DELIVERY" ? await this.deliveries.findByOrderId(cancelled.id) : null;
    return publicOrderView(cancelled, items, delivery);
  }
}
