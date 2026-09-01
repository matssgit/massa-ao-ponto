import { beforeEach, describe, expect, it } from "vitest";

import { GetTopCustomersUseCase } from "./get-top-customers.use-case.js";
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

describe("GetTopCustomersUseCase", () => {
  let restaurantsRepository: InMemoryRestaurantsRepository;
  let ordersRepository: InMemoryOrdersRepository;
  let orderItemsRepository: InMemoryOrderItemsRepository;
  let productsRepository: InMemoryProductsRepository;
  let productCategoriesRepository: InMemoryProductCategoriesRepository;
  let customersRepository: InMemoryCustomersRepository;
  let analyticsRepository: InMemoryOrdersAnalyticsRepository;
  let useCase: GetTopCustomersUseCase;

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
    useCase = new GetTopCustomersUseCase(
      restaurantsRepository,
      analyticsRepository,
    );
  });

  it("deve retornar os clientes ordenados por gasto, contagem de pedidos e id, descartando pedidos cancelados", async () => {
    const restaurant = await restaurantsRepository.create({
      name: "Rest",
      address: "",
      phone: "",
      timezone: "UTC",
    });

    const customerA = await customersRepository.create({
      name: "Alice",
      phone: "1",
      email: null,
    });
    const customerB = await customersRepository.create({
      name: "Bob",
      phone: "2",
      email: null,
    });
    const customerC = await customersRepository.create({
      name: "Charlie",
      phone: "3",
      email: null,
    }); // Não fará pedidos válidos

    await ordersRepository.create({
      restaurantId: restaurant.id,
      customerId: customerA.id,
      type: "DELIVERY",
      status: "DELIVERED",
      paymentStatus: "PAID",
      subtotal: 3000,
      deliveryFee: 0,
      total: 3000,
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
    await ordersRepository.create({
      restaurantId: restaurant.id,
      customerId: customerA.id,
      type: "DELIVERY",
      status: "DELIVERED",
      paymentStatus: "PAID",
      subtotal: 2000,
      deliveryFee: 0,
      total: 2000,
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

    await ordersRepository.create({
      restaurantId: restaurant.id,
      customerId: customerB.id,
      type: "DELIVERY",
      status: "DELIVERED",
      paymentStatus: "PAID",
      subtotal: 10000,
      deliveryFee: 0,
      total: 10000,
      customerName: "B",
      customerPhone: "2",
      deliveryStreet: null,
      deliveryNumber: null,
      deliveryComplement: null,
      deliveryNeighborhood: null,
      deliveryCity: null,
      deliveryState: null,
      deliveryZipCode: null,
      observation: null,
    });

    await ordersRepository.create({
      restaurantId: restaurant.id,
      customerId: customerC.id,
      type: "DELIVERY",
      status: "CANCELLED",
      paymentStatus: "PAID",
      subtotal: 50000,
      deliveryFee: 0,
      total: 50000,
      customerName: "C",
      customerPhone: "3",
      deliveryStreet: null,
      deliveryNumber: null,
      deliveryComplement: null,
      deliveryNeighborhood: null,
      deliveryCity: null,
      deliveryState: null,
      deliveryZipCode: null,
      observation: null,
    });

    const result = await useCase.execute({ restaurantId: restaurant.id });

    expect(result).toHaveLength(2);

    expect(result[0].customerId).toBe(customerB.id);
    expect(result[0].totalSpent).toBe(10000);
    expect(result[0].ordersCount).toBe(1);
    expect(result[0].paidOrdersCount).toBe(1);
    expect(result[0].averageTicket).toBe(10000);

    expect(result[1].customerId).toBe(customerA.id);
    expect(result[1].totalSpent).toBe(5000);
    expect(result[1].ordersCount).toBe(2);
    expect(result[1].paidOrdersCount).toBe(2);
    expect(result[1].averageTicket).toBe(2500); // 5000 / 2
  });

  it("deve retornar array vazio se restaurante não possuir vendas ativas", async () => {
    const restaurant = await restaurantsRepository.create({
      name: "R1",
      address: "",
      phone: "",
      timezone: "UTC",
    });
    const result = await useCase.execute({ restaurantId: restaurant.id });
    expect(result).toHaveLength(0);
  });

  it("deve respeitar o limite", async () => {
    const restaurant = await restaurantsRepository.create({
      name: "R1",
      address: "",
      phone: "",
      timezone: "UTC",
    });

    for (let i = 0; i < 3; i++) {
      const customer = await customersRepository.create({
        name: `C${i}`,
        phone: `${i}`,
        email: null,
      });
      await ordersRepository.create({
        restaurantId: restaurant.id,
        customerId: customer.id,
        type: "DELIVERY",
        status: "DELIVERED",
        paymentStatus: "PAID",
        subtotal: 1000,
        deliveryFee: 0,
        total: 1000,
        customerName: `C${i}`,
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
    }

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
