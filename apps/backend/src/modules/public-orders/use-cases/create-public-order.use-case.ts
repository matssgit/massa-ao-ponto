import type { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { createPublicOrderToken, hashPublicOrderToken } from "../../orders/public-order-tokens.js";
import type { OrderItemsRepository } from "../../orders/repositories/order-items-repository.js";
import type { CreateOrderUseCase } from "../../orders/use-cases/create-order.use-case.js";
import type { CreatePublicOrderBody } from "../schemas/public-order.schema.js";
import { publicOrderView } from "../public-order-view.js";
import { PublicDeliveryDisabledError } from "../../orders/errors/public-delivery-disabled-error.js";
import type { DeliveriesRepository } from "../../orders/repositories/deliveries-repository.js";
import type { OperatingHoursRepository } from "../../restaurants/repositories/operating-hours-repository.js";
import { isRestaurantOpenAt } from "../../restaurants/operating-hours.js";
import { RestaurantClosedError } from "../../restaurants/errors/restaurant-closed-error.js";
import type { SpecialHoursRepository } from "../../restaurants/repositories/special-hours-repository.js";

export class CreatePublicOrderUseCase {
  constructor(
    private readonly restaurants: RestaurantsRepository,
    private readonly createOrder: CreateOrderUseCase,
    private readonly orderItems: OrderItemsRepository,
    private readonly deliveries: DeliveriesRepository,
    private readonly operatingHours: OperatingHoursRepository,
    private readonly specialHours: SpecialHoursRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(slug: string, input: CreatePublicOrderBody) {
    const restaurant = await this.restaurants.findPublishedBySlug(slug);
    if (!restaurant) throw new RestaurantNotFoundError();
    const [hours, specialHours] = await Promise.all([
      this.operatingHours.findByRestaurantId(restaurant.id),
      this.specialHours.findByRestaurantId(restaurant.id),
    ]);
    if (!isRestaurantOpenAt(hours, restaurant.timezone, this.now(), restaurant.operationalOverride, specialHours)) throw new RestaurantClosedError();
    if (input.type === "DELIVERY" && !restaurant.deliveryEnabled) {
      throw new PublicDeliveryDisabledError();
    }

    const accessToken = createPublicOrderToken();
    const order = await this.createOrder.execute({
      restaurantId: restaurant.id,
      type: input.type,
      customer: input.customer,
      items: input.items,
      paymentMethod: input.paymentMethod,
      changeForCents: input.changeForCents,
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
    const pixPayment = restaurant.pixKey && restaurant.pixRecipientName
      ? { key: restaurant.pixKey, recipientName: restaurant.pixRecipientName }
      : null;
    return { accessToken, ...publicOrderView(order, items, delivery, pixPayment) };
  }
}
