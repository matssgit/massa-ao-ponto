import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  customers,
  deliveries,
  deliveryHistory,
  orderHistory,
  orderItems,
  orders,
  productCategories,
  products,
  reservationHistory,
  reservations,
  restaurants,
  tables,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { randomUUID } from "node:crypto";

describe("Dashboard - Category Performance (E2E)", () => {
  beforeAll(async () => await app.ready());
  afterAll(async () => await app.close());

  beforeEach(async () => {
    await db.delete(deliveryHistory);
    await db.delete(deliveries);
    await db.delete(orderHistory);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(reservationHistory);
    await db.delete(reservations);
    await db.delete(tables);
    await db.delete(products);
    await db.delete(productCategories);
    await db.delete(customers);
    await db.delete(restaurants);
  });

  it("deve retornar as categorias agrupadas corretamente realizando JOINs atômicos no PostgreSQL", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
      .returning();
    const [cust] = await db
      .insert(customers)
      .values({ name: "C1", phone: "1" })
      .returning();

    const [catPizza] = await db
      .insert(productCategories)
      .values({ restaurantId: rest.id, name: "Pizzas" })
      .returning();
    const [catDrink] = await db
      .insert(productCategories)
      .values({ restaurantId: rest.id, name: "Bebidas" })
      .returning();

    const [prodP1] = await db
      .insert(products)
      .values({
        restaurantId: rest.id,
        categoryId: catPizza.id,
        name: "Mussarela",
        description: "",
        price: 2000,
        active: true,
      })
      .returning();
    const [prodD1] = await db
      .insert(products)
      .values({
        restaurantId: rest.id,
        categoryId: catDrink.id,
        name: "Coca",
        description: "",
        price: 1000,
        active: true,
      })
      .returning();

    const [o1] = await db
      .insert(orders)
      .values({
        restaurantId: rest.id,
        customerId: cust.id,
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
      })
      .returning();
    await db.insert(orderItems).values([
      {
        orderId: o1.id,
        productId: prodP1.id,
        productName: "Mussarela",
        quantity: 2,
        unitPrice: 2000,
        subtotal: 4000,
      },
      {
        orderId: o1.id,
        productId: prodD1.id,
        productName: "Coca",
        quantity: 2,
        unitPrice: 1000,
        subtotal: 2000,
      },
    ]);

    const [o2] = await db
      .insert(orders)
      .values({
        restaurantId: rest.id,
        customerId: cust.id,
        type: "PICKUP",
        status: "PENDING",
        paymentStatus: "PENDING",
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
      })
      .returning();
    await db
      .insert(orderItems)
      .values([
        {
          orderId: o2.id,
          productId: prodP1.id,
          productName: "Mussarela",
          quantity: 2,
          unitPrice: 2000,
          subtotal: 4000,
        },
      ]);

    const [o3] = await db
      .insert(orders)
      .values({
        restaurantId: rest.id,
        customerId: cust.id,
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
      })
      .returning();
    await db
      .insert(orderItems)
      .values([
        {
          orderId: o3.id,
          productId: prodD1.id,
          productName: "Coca",
          quantity: 10,
          unitPrice: 1000,
          subtotal: 10000,
        },
      ]);

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${rest.id}/dashboard/category-performance`,
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();

    expect(data).toHaveLength(2);

    // Pizzas: Order 1 e Order 2. Revenue = 8000, Quantity = 4, OrderCount = 2
    expect(data[0].categoryId).toBe(catPizza.id);
    expect(data[0].categoryName).toBe("Pizzas");
    expect(data[0].revenue).toBe(8000);
    expect(data[0].quantitySold).toBe(4);
    expect(data[0].orderCount).toBe(2);

    // Bebidas: Order 1. O Order 3 foi CANCELADO e deve ser ignorado. Revenue = 2000, Quantity = 2, OrderCount = 1
    expect(data[1].categoryId).toBe(catDrink.id);
    expect(data[1].categoryName).toBe("Bebidas");
    expect(data[1].revenue).toBe(2000);
    expect(data[1].quantitySold).toBe(2);
    expect(data[1].orderCount).toBe(1);
  });

  it("deve retornar array vazio se restaurante não possuir vendas ativas", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
      .returning();
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${rest.id}/dashboard/category-performance`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(0);
  });

  it("deve retornar HTTP 400 se o período informado for invertido", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${randomUUID()}/dashboard/category-performance?startsAt=2026-08-25&endsAt=2026-08-24`,
    });
    expect(response.statusCode).toBe(400);
  });
});
