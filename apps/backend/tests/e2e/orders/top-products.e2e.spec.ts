import { useTestAuth } from "../../helpers/auth.js";
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

const auth = useTestAuth(app);

describe("Dashboard - Top Products (E2E)", () => {
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

  it("deve retornar os produtos ordenados corretamente realizando JOINs no PostgreSQL", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(rest.id);
    const [cust] = await db
      .insert(customers)
      .values({ name: "C1", phone: "1" })
      .returning();

    // 1. Criar Categoria e Produtos Reais no Banco de Dados para satisfazer as Foreign Keys
    const [category] = await db
      .insert(productCategories)
      .values({ restaurantId: rest.id, name: "Pizzas" })
      .returning();

    const [prod1] = await db
      .insert(products)
      .values({
        restaurantId: rest.id,
        categoryId: category.id,
        name: "P1",
        description: "Desc",
        price: 2000,
        active: true,
      })
      .returning();
    const [prod2] = await db
      .insert(products)
      .values({
        restaurantId: rest.id,
        categoryId: category.id,
        name: "P2",
        description: "Desc",
        price: 2000,
        active: true,
      })
      .returning();

    const p1 = prod1.id;
    const p2 = prod2.id;

    // 2. Inserir Pedidos e Itens
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
        productId: p1,
        productName: "P1",
        quantity: 2,
        unitPrice: 2000,
        subtotal: 4000,
      },
      {
        orderId: o1.id,
        productId: p2,
        productName: "P2",
        quantity: 1,
        unitPrice: 2000,
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
    await db
      .insert(orderItems)
      .values([
        {
          orderId: o2.id,
          productId: p2,
          productName: "P2",
          quantity: 3,
          unitPrice: 2000,
          subtotal: 6000,
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
          productId: p1,
          productName: "P1",
          quantity: 5,
          unitPrice: 2000,
          subtotal: 10000,
        },
      ]);

    // 3. Consultar o Analytics
    const response = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${rest.id}/dashboard/top-products`,
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();

    expect(data).toHaveLength(2);

    expect(data[0].productId).toBe(p1);
    expect(data[0].productName).toBe("P1");
    expect(data[0].revenue).toBe(4000);
    expect(data[0].quantitySold).toBe(2);
    expect(data[0].orderCount).toBe(1);

    expect(data[1].productId).toBe(p2);
    expect(data[1].productName).toBe("P2");
    expect(data[1].revenue).toBe(2000);
    expect(data[1].quantitySold).toBe(4);
    expect(data[1].orderCount).toBe(2);
  });

  it("deve retornar 400 para período invertido", async () => {
    const response = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${(await auth.createRestaurant()).id}/dashboard/top-products?startsAt=2026-08-25&endsAt=2026-08-24`,
    });
    expect(response.statusCode).toBe(400);
  });

  it.each(["top-products", "category-performance", "top-customers"])(
    "aceita limit 100 em %s",
    async (endpoint) => {
      const [rest] = await db
        .insert(restaurants)
        .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
        .returning();
    await auth.grant(rest.id);

      const response = await app.inject({
        headers: auth.headers,
        method: "GET",
        url: `/restaurants/${rest.id}/dashboard/${endpoint}?limit=100`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    },
  );

  it.each(["top-products", "category-performance", "top-customers"])(
    "rejeita limit acima de 100 em %s",
    async (endpoint) => {
      const response = await app.inject({
        headers: auth.headers,
        method: "GET",
        url: `/restaurants/${(await auth.createRestaurant()).id}/dashboard/${endpoint}?limit=101`,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        code: "VALIDATION_ERROR",
        message: "Validation error.",
        issues: expect.any(Array),
      });
    },
  );
});
