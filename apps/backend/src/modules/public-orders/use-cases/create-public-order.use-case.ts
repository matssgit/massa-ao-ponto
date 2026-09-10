import type { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { createPublicOrderToken, hashPublicOrderToken } from "../../orders/public-order-tokens.js";
import type { OrderItemsRepository } from "../../orders/repositories/order-items-repository.js";
import type { CreateOrderUseCase } from "../../orders/use-cases/create-order.use-case.js";
import type { CreatePublicOrderBody } from "../schemas/public-order.schema.js";
import { publicOrderView } from "../public-order-view.js";
import { PublicDeliveryDisabledError } from "../../orders/errors/public-delivery-disabled-error.js";
import type { DeliveriesRepository } from "../../orders/repositories/deliveries-repository.js";

export class CreatePublicOrderUseCase {
  constructor(
    private readonly restaurants: RestaurantsRepository,
    private readonly createOrder: CreateOrderUseCase,
    private readonly orderItems: OrderItemsRepository,
    private readonly deliveries: DeliveriesRepository,
  ) {}

  async execute(slug: string, input: CreatePublicOrderBody) {
    const restaurant = await this.restaurants.findPublishedBySlug(slug);
    if (!restaurant) throw new RestaurantNotFoundError();
    if (input.type === "DELIVERY" && !restaurant.deliveryEnabled) {
      throw new PublicDeliveryDisabledError();
    }

    const accessToken = createPublicOrderToken();
    const order = await this.createOrder.execute({
      restaurantId: restaurant.id,
      type: input.type,
      customer: input.customer,
      items: input.items,
      deliveryFee: input.type === "DELIVERY" ? restaurant.deliveryFeeCents : 0,
      ...(input.type === "DELIVERY" ? {
        deliveryAddress: input.deliveryAddress,
        initializeDelivery: true,
      } : {}),
      observation: input.observation,
      publicAccessTokenHash: hashPublicOrderToken(accessToken),
    });
    const items = await this.orderItems.findManyByOrderIds([order.id]);
    const delivery = input.type === "DELIVERY"
      ? await this.deliveries.findByOrderId(order.id)
      : null;
    return { accessToken, ...publicOrderView(order, items, delivery) };
  }
}
