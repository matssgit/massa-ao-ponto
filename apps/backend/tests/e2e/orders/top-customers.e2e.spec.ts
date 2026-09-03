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

describe("Dashboard - Top Customers (E2E)", () => {
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

  it("deve retornar os clientes agregados e ordenados nativamente pelo PostgreSQL", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(rest.id);
    const [customerA] = await db
      .insert(customers)
      .values({ name: "Alice", phone: "1" })
      .returning();
    const [customerB] = await db
      .insert(customers)
      .values({ name: "Bob", phone: "2" })
      .returning();

    await db.insert(orders).values([
      {
        restaurantId: rest.id,
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
      },
      {
        restaurantId: rest.id,
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
      },
      {
        restaurantId: rest.id,
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
      },
      {
        restaurantId: rest.id,
        customerId: customerA.id,
        type: "PICKUP",
        status: "PENDING",
        paymentStatus: "PENDING",
        subtotal: 7000,
        deliveryFee: 0,
        total: 7000,
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
      },
      {
        restaurantId: rest.id,
        customerId: customerB.id,
        type: "DELIVERY",
        status: "CANCELLED",
        paymentStatus: "PAID",
        subtotal: 50000,
        deliveryFee: 0,
        total: 50000,
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
      },
    ]);

    const response = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${rest.id}/dashboard/top-customers`,
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();

    expect(data).toHaveLength(2);

    expect(data[0].customerId).toBe(customerB.id);
    expect(data[0].customerName).toBe("Bob");
    expect(data[0].totalSpent).toBe(10000);
    expect(data[0].ordersCount).toBe(1);
    expect(data[0].paidOrdersCount).toBe(1);
    expect(data[0].averageTicket).toBe(10000);

    expect(data[1].customerId).toBe(customerA.id);
    expect(data[1].customerName).toBe("Alice");
    expect(data[1].totalSpent).toBe(5000);
    expect(data[1].ordersCount).toBe(3);
    expect(data[1].paidOrdersCount).toBe(2);
    expect(data[1].averageTicket).toBe(2500);
  });

  it("deve retornar array vazio se não houver clientes ativos", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(rest.id);
    const response = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${rest.id}/dashboard/top-customers`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(0);
  });

  it("deve retornar HTTP 400 se o período informado for invertido", async () => {
    const response = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${(await auth.createRestaurant()).id}/dashboard/top-customers?startsAt=2026-08-25&endsAt=2026-08-24`,
    });
    expect(response.statusCode).toBe(400);
  });
});
