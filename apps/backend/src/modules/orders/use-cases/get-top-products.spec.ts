import { beforeEach, describe, expect, it } from "vitest";

import { GetTopProductsUseCase } from "./get-top-products.use-case.js";
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

describe("GetTopProductsUseCase", () => {
  let restaurantsRepository: InMemoryRestaurantsRepository;
  let ordersRepository: InMemoryOrdersRepository;
  let orderItemsRepository: InMemoryOrderItemsRepository;
  let productsRepository: InMemoryProductsRepository;
  let productCategoriesRepository: InMemoryProductCategoriesRepository;
  let customersRepository: InMemoryCustomersRepository;
  let analyticsRepository: InMemoryOrdersAnalyticsRepository;
  let useCase: GetTopProductsUseCase;

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

    useCase = new GetTopProductsUseCase(
      restaurantsRepository,
      analyticsRepository,
    );
  });

  it("deve retornar os produtos ordenados por receita descartando pedidos cancelados", async () => {
    const restaurant = await restaurantsRepository.create({
      name: "Rest",
      address: "",
      phone: "",
      timezone: "UTC",
    });
    const productA = randomUUID();
    const productB = randomUUID();

    const order1 = await ordersRepository.create({
      restaurantId: restaurant.id,
      customerId: randomUUID(),
      type: "DELIVERY",
      status: "DELIVERED",
      paymentStatus: "PAID",
      subtotal: 6000,
      deliveryFee: 0,
      total: 6000,
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
    await orderItemsRepository.createMany([
      {
        orderId: order1.id,
        productId: productA,
        productName: "Pizza A",
        quantity: 2,
        unitPrice: 2000,
        subtotal: 4000,
      },
      {
        orderId: order1.id,
        productId: productB,
        productName: "Pizza B",
        quantity: 1,
        unitPrice: 2000,
        subtotal: 2000,
      },
    ]);

    const order2 = await ordersRepository.create({
      restaurantId: restaurant.id,
      customerId: randomUUID(),
      type: "DINE_IN",
      status: "PENDING",
      paymentStatus: "PENDING",
      subtotal: 6000,
      deliveryFee: 0,
      total: 6000,
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
    await orderItemsRepository.createMany([
      {
        orderId: order2.id,
        productId: productB,
        productName: "Pizza B",
        quantity: 3,
        unitPrice: 2000,
        subtotal: 6000,
      },
    ]);

    const order3 = await ordersRepository.create({
      restaurantId: restaurant.id,
      customerId: randomUUID(),
      type: "DELIVERY",
      status: "CANCELLED",
      paymentStatus: "PAID",
      subtotal: 10000,
      deliveryFee: 0,
      total: 10000,
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
    await orderItemsRepository.createMany([
      {
        orderId: order3.id,
        productId: productA,
        productName: "Pizza A",
        quantity: 5,
        unitPrice: 2000,
        subtotal: 10000,
      },
    ]);

    const result = await useCase.execute({ restaurantId: restaurant.id });

    expect(result).toHaveLength(2);

    expect(result[0].productId).toBe(productA);
    expect(result[0].revenue).toBe(4000);
    expect(result[0].quantitySold).toBe(2);
    expect(result[0].orderCount).toBe(1);

    expect(result[1].productId).toBe(productB);
    expect(result[1].revenue).toBe(2000);
    expect(result[1].quantitySold).toBe(4);
    expect(result[1].orderCount).toBe(2);
  });

  it("deve respeitar o limite", async () => {
    const restaurant = await restaurantsRepository.create({
      name: "Rest",
      address: "",
      phone: "",
      timezone: "UTC",
    });
    const order = await ordersRepository.create({
      restaurantId: restaurant.id,
      customerId: randomUUID(),
      type: "DELIVERY",
      status: "DELIVERED",
      paymentStatus: "PAID",
      subtotal: 0,
      deliveryFee: 0,
      total: 0,
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
    await orderItemsRepository.createMany([
      {
        orderId: order.id,
        productId: randomUUID(),
        productName: "A",
        quantity: 1,
        unitPrice: 1,
        subtotal: 1,
      },
      {
        orderId: order.id,
        productId: randomUUID(),
        productName: "B",
        quantity: 1,
        unitPrice: 1,
        subtotal: 1,
      },
      {
        orderId: order.id,
        productId: randomUUID(),
        productName: "C",
        quantity: 1,
        unitPrice: 1,
        subtotal: 1,
      },
    ]);

    const result = await useCase.execute({
      restaurantId: restaurant.id,
      limit: 2,
    });
    expect(result).toHaveLength(2);
  });

  it("deve rejeitar se datas forem invertidas", async () => {
    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        startsAt: new Date("2026-08-25"),
        endsAt: new Date("2026-08-24"),
      }),
    ).rejects.toBeInstanceOf(InvalidPeriodFilterError);
  });

  it("deve rejeitar restaurante inexistente", async () => {
    await expect(
      useCase.execute({ restaurantId: randomUUID() }),
    ).rejects.toBeInstanceOf(RestaurantNotFoundError);
  });
});
