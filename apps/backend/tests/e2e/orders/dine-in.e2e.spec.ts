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

describe("Dine-In Orders (E2E)", () => {
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

  async function setupDineIn() {
    const [restaurant] = await db
      .insert(restaurants)
      .values({ name: "Rest", address: "Rua", phone: "1", timezone: "UTC" })
      .returning();
    await auth.grant(restaurant.id);
    const [customer] = await db
      .insert(customers)
      .values({ name: "Cli", phone: "11900000000" })
      .returning();
    const [table] = await db
      .insert(tables)
      .values({
        restaurantId: restaurant.id,
        number: "1",
        capacity: 4,
        type: "table",
        active: true,
      })
      .returning();
    const [category] = await db
      .insert(productCategories)
      .values({ restaurantId: restaurant.id, name: "Pizza" })
      .returning();
    const [product] = await db
      .insert(products)
      .values({
        restaurantId: restaurant.id,
        categoryId: category.id,
        name: "Mussarela",
        description: "",
        price: 4000,
        active: true,
      })
      .returning();

    return { restaurant, customer, table, product };
  }

  describe("POST /restaurants/:restaurantId/orders (DINE_IN)", () => {
    it("deve criar um pedido presencial vinculando a mesa e gerando histórico (201)", async () => {
      const { restaurant, customer, table, product } = await setupDineIn();

      const response = await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customer: { name: customer.name, phone: customer.phone },
          type: "DINE_IN",
          tableId: table.id,
          items: [{ productId: product.id, quantity: 1 }],
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().tableId).toBe(table.id);
    });

    it("deve rejeitar payload inconsistente de DINE_IN sem mesa ou DELIVERY com mesa (400)", async () => {
      const { restaurant, customer, table, product } = await setupDineIn();

      const resDineInNoTable = await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customer: { name: customer.name, phone: customer.phone },
          type: "DINE_IN",
          items: [{ productId: product.id, quantity: 1 }],
        },
      });
      expect(resDineInNoTable.statusCode).toBe(400);

      const resDeliveryWithTable = await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customer: { name: customer.name, phone: customer.phone },
          type: "DELIVERY",
          tableId: table.id,
          items: [{ productId: product.id, quantity: 1 }],
        },
      });
      expect(resDeliveryWithTable.statusCode).toBe(400);
    });

    it("deve rejeitar criação em mesa de outro restaurante (400)", async () => {
      const { restaurant, customer, product } = await setupDineIn();
      const [otherRest] = await db
        .insert(restaurants)
        .values({ name: "Other", address: "Rua", phone: "3", timezone: "UTC" })
        .returning();
    await auth.grant(otherRest.id);
      const [otherTable] = await db
        .insert(tables)
        .values({
          restaurantId: otherRest.id,
          number: "2",
          capacity: 2,
          type: "table",
          active: true,
        })
        .returning();

      const response = await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customer: { name: customer.name, phone: customer.phone },
          type: "DINE_IN",
          tableId: otherTable.id,
          items: [{ productId: product.id, quantity: 1 }],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("deve proteger ocupação dupla concorrente via SELECT FOR UPDATE (409)", async () => {
      const { restaurant, customer, table, product } = await setupDineIn();

      const payload = {
        customer: { name: customer.name, phone: customer.phone },
        type: "DINE_IN",
        tableId: table.id,
        items: [{ productId: product.id, quantity: 1 }],
      };

      const [res1, res2] = await Promise.all([
        app.inject({
          headers: auth.headers,
          method: "POST",
          url: `/restaurants/${restaurant.id}/orders`,
          payload,
        }),
        app.inject({
          headers: auth.headers,
          method: "POST",
          url: `/restaurants/${restaurant.id}/orders`,
          payload,
        }),
      ]);

      const statusCodes = [res1.statusCode, res2.statusCode].sort();

      expect(statusCodes).toEqual([201, 409]);
    });

    it("deve liberar a mesa (permitir novo pedido) assim que o pedido atual for DELIVERED ou CANCELLED", async () => {
      const { restaurant, customer, table, product } = await setupDineIn();

      const res1 = await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customer: { name: customer.name, phone: customer.phone },
          type: "DINE_IN",
          tableId: table.id,
          items: [{ productId: product.id, quantity: 1 }],
        },
      });
      const orderId = res1.json().id;

      await app.inject({
        headers: auth.headers,
        method: "PATCH",
        url: `/restaurants/${restaurant.id}/orders/${orderId}/cancel`,
      });

      const res2 = await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customer: { name: customer.name, phone: customer.phone },
          type: "DINE_IN",
          tableId: table.id,
          items: [{ productId: product.id, quantity: 1 }],
        },
      });

      expect(res2.statusCode).toBe(201);
    });

    it("deve finalizar READY -> DELIVERED sem passar por OUT_FOR_DELIVERY e liberar a mesa", async () => {
      const { restaurant, customer, table, product } = await setupDineIn();

      const firstOrderResponse = await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customer: { name: customer.name, phone: customer.phone },
          type: "DINE_IN",
          tableId: table.id,
          items: [{ productId: product.id, quantity: 1 }],
        },
      });
      expect(firstOrderResponse.statusCode).toBe(201);
      const orderId = firstOrderResponse.json().id;

      for (const status of ["CONFIRMED", "PREPARING", "READY"] as const) {
        const response = await app.inject({
          headers: auth.headers,
          method: "PATCH",
          url: `/restaurants/${restaurant.id}/orders/${orderId}/status`,
          payload: { status },
        });
        expect(response.statusCode).toBe(204);
      }

      const logisticsResponse = await app.inject({
        headers: auth.headers,
        method: "PATCH",
        url: `/restaurants/${restaurant.id}/orders/${orderId}/status`,
        payload: { status: "OUT_FOR_DELIVERY" },
      });
      expect(logisticsResponse.statusCode).toBe(409);

      const completeResponse = await app.inject({
        headers: auth.headers,
        method: "PATCH",
        url: `/restaurants/${restaurant.id}/orders/${orderId}/status`,
        payload: { status: "DELIVERED" },
      });
      expect(completeResponse.statusCode).toBe(204);

      const nextOrderResponse = await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customer: { name: customer.name, phone: customer.phone },
          type: "DINE_IN",
          tableId: table.id,
          items: [{ productId: product.id, quantity: 1 }],
        },
      });

      expect(nextOrderResponse.statusCode).toBe(201);
    });
  });
});
