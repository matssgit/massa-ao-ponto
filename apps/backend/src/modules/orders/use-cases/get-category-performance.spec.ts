import { beforeEach, describe, expect, it } from "vitest";

import { GetCategoryPerformanceUseCase } from "./get-category-performance.use-case.js";
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

describe("GetCategoryPerformanceUseCase", () => {
  let restaurantsRepository: InMemoryRestaurantsRepository;
  let ordersRepository: InMemoryOrdersRepository;
  let orderItemsRepository: InMemoryOrderItemsRepository;
  let productsRepository: InMemoryProductsRepository;
  let productCategoriesRepository: InMemoryProductCategoriesRepository;
  let customersRepository: InMemoryCustomersRepository;
  let analyticsRepository: InMemoryOrdersAnalyticsRepository;
  let useCase: GetCategoryPerformanceUseCase;

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

    useCase = new GetCategoryPerformanceUseCase(
      restaurantsRepository,
      analyticsRepository,
    );
  });

  it("deve retornar as categorias ordenadas por receita descartando pedidos cancelados", async () => {
    const restaurant = await restaurantsRepository.create({
      name: "Rest",
      address: "",
      phone: "",
      timezone: "UTC",
    });

    const catPizza = await productCategoriesRepository.create({
      restaurantId: restaurant.id,
      name: "Pizzas",
      displayOrder: 0,
    });
    const catBebida = await productCategoriesRepository.create({
      restaurantId: restaurant.id,
      name: "Bebidas",
      displayOrder: 1,
    });

    const prodPizza = await productsRepository.create({
      restaurantId: restaurant.id,
      categoryId: catPizza.id,
      name: "Mussarela",
      description: "",
      price: 2000,
      displayOrder: 0,
    });
    const prodBebida = await productsRepository.create({
      restaurantId: restaurant.id,
      categoryId: catBebida.id,
      name: "Coca",
      description: "",
      price: 1000,
      displayOrder: 1,
    });

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
        productId: prodPizza.id,
        productName: "Mussarela",
        quantity: 2,
        unitPrice: 2000,
        subtotal: 4000,
      },
      {
        orderId: order1.id,
        productId: prodBebida.id,
        productName: "Coca",
        quantity: 2,
        unitPrice: 1000,
        subtotal: 2000,
      },
    ]);

    const order2 = await ordersRepository.create({
      restaurantId: restaurant.id,
      customerId: randomUUID(),
      type: "DELIVERY",
      status: "CANCELLED",
      paymentStatus: "PAID",
      subtotal: 4000,
      deliveryFee: 0,
      total: 4000,
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
        productId: prodPizza.id,
        productName: "Mussarela",
        quantity: 2,
        unitPrice: 2000,
        subtotal: 4000,
      },
    ]);

    const result = await useCase.execute({ restaurantId: restaurant.id });

    expect(result).toHaveLength(2);

    expect(result[0].categoryId).toBe(catPizza.id);
    expect(result[0].revenue).toBe(4000);
    expect(result[0].quantitySold).toBe(2);
    expect(result[0].orderCount).toBe(1);

    expect(result[1].categoryId).toBe(catBebida.id);
    expect(result[1].revenue).toBe(2000);
    expect(result[1].quantitySold).toBe(2);
    expect(result[1].orderCount).toBe(1);
  });

  it("deve retornar array vazio se não houver vendas ou a categoria pertencer a outro restaurante", async () => {
    const restaurant = await restaurantsRepository.create({
      name: "R1",
      address: "",
      phone: "",
      timezone: "UTC",
    });
    await productCategoriesRepository.create({
      restaurantId: randomUUID(),
      name: "Fantasma",
      displayOrder: 0,
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

    for (let i = 0; i < 3; i++) {
      const cat = await productCategoriesRepository.create({
        restaurantId: restaurant.id,
        name: `C${i}`,
        displayOrder: i,
      });
      const prod = await productsRepository.create({
        restaurantId: restaurant.id,
        categoryId: cat.id,
        name: `P${i}`,
        description: "",
        price: 10,
        displayOrder: i,
      });
      await orderItemsRepository.createMany([
        {
          orderId: order.id,
          productId: prod.id,
          productName: `P${i}`,
          quantity: 1,
          unitPrice: 10,
          subtotal: 10,
        },
      ]);
    }

    const result = await useCase.execute({
      restaurantId: restaurant.id,
      limit: 2,
    });
    expect(result).toHaveLength(2);
  });

  it("deve rejeitar se as datas forem invertidas", async () => {
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
