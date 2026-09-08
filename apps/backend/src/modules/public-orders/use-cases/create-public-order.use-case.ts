import type { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { createPublicOrderToken, hashPublicOrderToken } from "../../orders/public-order-tokens.js";
import type { OrderItemsRepository } from "../../orders/repositories/order-items-repository.js";
import type { CreateOrderUseCase } from "../../orders/use-cases/create-order.use-case.js";
import type { CreatePublicOrderBody } from "../schemas/public-order.schema.js";
import { publicOrderView } from "../public-order-view.js";

export class CreatePublicOrderUseCase {
  constructor(
    private readonly restaurants: RestaurantsRepository,
    private readonly createOrder: CreateOrderUseCase,
    private readonly orderItems: OrderItemsRepository,
  ) {}

  async execute(slug: string, input: CreatePublicOrderBody) {
    const restaurant = await this.restaurants.findPublishedBySlug(slug);
    if (!restaurant) throw new RestaurantNotFoundError();

    const accessToken = createPublicOrderToken();
    const order = await this.createOrder.execute({
      restaurantId: restaurant.id,
      type: "PICKUP",
      customer: input.customer,
      items: input.items,
      deliveryFee: 0,
      observation: input.observation,
      publicAccessTokenHash: hashPublicOrderToken(accessToken),
    });
    const items = await this.orderItems.findManyByOrderIds([order.id]);
    return { accessToken, ...publicOrderView(order, items) };
  }
}
