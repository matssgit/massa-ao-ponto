import { PublicOrderNotFoundError } from "../../orders/errors/public-order-not-found-error.js";
import { hashPublicOrderToken, isPublicOrderToken } from "../../orders/public-order-tokens.js";
import type { OrderItemsRepository } from "../../orders/repositories/order-items-repository.js";
import type { OrdersRepository } from "../../orders/repositories/orders-repository.js";
import { publicOrderView } from "../public-order-view.js";

export class GetPublicOrderUseCase {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly orderItems: OrderItemsRepository,
  ) {}

  async execute(token: string) {
    if (!isPublicOrderToken(token)) throw new PublicOrderNotFoundError();
    const order = await this.orders.findByPublicAccessTokenHash(hashPublicOrderToken(token));
    if (!order) throw new PublicOrderNotFoundError();
    const items = await this.orderItems.findManyByOrderIds([order.id]);
    return publicOrderView(order, items);
  }
}
