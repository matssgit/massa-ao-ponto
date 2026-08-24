import { beforeEach, describe, expect, it } from "vitest";

import { GetSalesSummaryUseCase } from "./get-sales-summary.use-case.js";
import { InMemoryCustomersRepository } from "../../reservations/repositories/in-memory-customers-repository.js";
import { InMemoryOrderItemsRepository } from "../repositories/in-memory-order-items-repository.js";
import { InMemoryOrdersAnalyticsRepository } from "../repositories/in-memory-orders-analytics-repository.js";
import { InMemoryOrdersRepository } from "../repositories/in-memory-orders-repository.js";
import { InMemoryProductCategoriesRepository } from "../../products/repositories/in-memory-product-categories-repository.js";
import { InMemoryProductsRepository } from "../../products/repositories/in-memory-products-repository.js";
import { InMemoryRestaurantsRepository } from "../../restaurants/repositories/in-memory-restaurants-repository.js";
import { InvalidPeriodFilterError } from "../errors/invalid-period-filter-error.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { randomUUID } from "node:crypto";

describe("GetSalesSummaryUseCase", () => {
  let restaurantsRepository: InMemoryRestaurantsRepository;
  let ordersRepository: InMemoryOrdersRepository;
  let orderItemsRepository: InMemoryOrderItemsRepository;
  let productsRepository: InMemoryProductsRepository;
  let productCategoriesRepository: InMemoryProductCategoriesRepository;
  let customersRepository: InMemoryCustomersRepository;
  let analyticsRepository: InMemoryOrdersAnalyticsRepository;
  let useCase: GetSalesSummaryUseCase;

  beforeEach(() => {
    restaurantsRepository = new InMemoryRestaurantsRepository();
    ordersRepository = new InMemoryOrdersRepository();
    orderItemsRepository = new InMemoryOrderItemsRepository();
    productsRepository = new InMemoryProductsRepository();
    productCategoriesRepository = new InMemoryProductCategoriesRepository();
    customersRepository = new InMemoryCustomersRepository();

    analyticsRepository = new InMemoryOrdersAnalyticsRepository(
      ordersRepository,
      orderItemsRepository,
      productsRepository,
      productCategoriesRepository,
      customersRepository,
    );

    useCase = new GetSalesSummaryUseCase(
      restaurantsRepository,
      analyticsRepository,
    );
  });

  it("deve calcular os totais corretamente e excluir cancelados da receita", async () => {
    const restaurant = await restaurantsRepository.create({
      name: "Rest",
      address: "",
      phone: "",
      timezone: "UTC",
    });

    const createOrder = async (
      status: any,
      paymentStatus: any,
      total: number,
    ) => {
      await ordersRepository.create({
        restaurantId: restaurant.id,
        customerId: randomUUID(),
        type: "DELIVERY",
        status,
        paymentStatus,
        subtotal: total,
        deliveryFee: 0,
        total,
        customerName: "A",
        customerPhone: "1",
        deliveryStreet: null,
        deliveryNumber: null,
        deliveryComplement: null,
        deliveryNeighborhood: null,
        deliveryCity: null,
        deliveryState: null,
        deliveryZipCode: null,
        observation: null,
      });
    };

    await createOrder("DELIVERED", "PAID", 5000);
    await createOrder("DELIVERED", "PAID", 3000);
    await createOrder("PENDING", "PENDING", 2000);
    await createOrder("CANCELLED", "PAID", 10000);

    const summary = await useCase.execute({ restaurantId: restaurant.id });

    expect(summary.orders.total).toBe(4);
    expect(summary.orders.delivered).toBe(2);
    expect(summary.orders.cancelled).toBe(1);
    expect(summary.orders.pending).toBe(1);

    expect(summary.revenue.gross).toBe(10000);
    expect(summary.revenue.paid).toBe(8000);

    expect(summary.averageTicket).toBe(3333);
  });

  it("deve retornar 0 para tudo caso o restaurante não tenha pedidos", async () => {
    const restaurant = await restaurantsRepository.create({
      name: "Rest",
      address: "",
      phone: "",
      timezone: "UTC",
    });
    const summary = await useCase.execute({ restaurantId: restaurant.id });

    expect(summary.orders.total).toBe(0);
    expect(summary.revenue.gross).toBe(0);
    expect(summary.averageTicket).toBe(0);
  });

  it("deve isolar métricas entre restaurantes diferentes", async () => {
    const rest1 = await restaurantsRepository.create({
      name: "R1",
      address: "",
      phone: "",
      timezone: "UTC",
    });
    const rest2 = await restaurantsRepository.create({
      name: "R2",
      address: "",
      phone: "",
      timezone: "UTC",
    });

    await ordersRepository.create({
      restaurantId: rest1.id,
      customerId: randomUUID(),
      type: "DELIVERY",
      status: "DELIVERED",
      paymentStatus: "PAID",
      subtotal: 5000,
      deliveryFee: 0,
      total: 5000,
      customerName: "A",
      customerPhone: "1",
      deliveryStreet: null,
      deliveryNumber: null,
      deliveryComplement: null,
      deliveryNeighborhood: null,
      deliveryCity: null,
      deliveryState: null,
      deliveryZipCode: null,
      observation: null,
    });

    const summary2 = await useCase.execute({ restaurantId: rest2.id });
    expect(summary2.revenue.gross).toBe(0);
  });

  it("deve rejeitar se as datas estiverem invertidas", async () => {
    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        startsAt: new Date("2026-08-25"),
        endsAt: new Date("2026-08-24"),
      }),
    ).rejects.toBeInstanceOf(InvalidPeriodFilterError);
  });

  it("deve rejeitar se o restaurante não existir", async () => {
    await expect(
      useCase.execute({ restaurantId: randomUUID() }),
    ).rejects.toBeInstanceOf(RestaurantNotFoundError);
  });
});
