import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  customers,
  orderHistory,
  orderItems,
  orders,
  productCategories,
  products,
  restaurants,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { randomUUID } from "node:crypto";

describe("Orders (E2E)", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.delete(orderHistory);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(products);
    await db.delete(productCategories);
    await db.delete(customers);
    await db.delete(restaurants);
  });

  async function createDeps() {
    const restRes = await app.inject({
      method: "POST",
      url: "/restaurants",
      payload: { name: "Rest", address: "Rua", phone: "11", timezone: "UTC" },
    });
    const restaurant = restRes.json();

    const catRes = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/product-categories`,
      payload: { name: "Pizza" },
    });
    const category = catRes.json();

    const prodRes = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/products`,
      payload: { categoryId: category.id, name: "Calabresa", price: 4000 },
    });
    const product = prodRes.json();

    // Como Customers não tem rota de criação autônoma, criamos via Drizzle para o teste
    const [customer] = await db
      .insert(customers)
      .values({ name: "Maria", phone: "11999", email: "a@a.com" })
      .returning();

    return { restaurant, category, product, customer };
  }

  describe("POST /restaurants/:restaurantId/orders", () => {
    it("deve criar um pedido DELIVERY, calcular totais no server e gerar snapshot (201)", async () => {
      const { restaurant, product, customer } = await createDeps();

      const response = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customerId: customer.id,
          type: "DELIVERY",
          items: [{ productId: product.id, quantity: 2 }], // 4000 * 2 = 8000
          deliveryFee: 500,
          deliveryAddress: {
            street: "Rua",
            number: "1",
            neighborhood: "Bairro",
            city: "Cidade",
            state: "UF",
            zipCode: "000",
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const order = response.json();

      expect(order.id).toBeDefined();
      expect(order.status).toBe("PENDING");
      expect(order.customerName).toBe("Maria");
      expect(order.subtotal).toBe(8000);
      expect(order.total).toBe(8500); // 8000 + 500
    });

    it("deve criar um pedido PICKUP (201)", async () => {
      const { restaurant, product, customer } = await createDeps();

      const response = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customerId: customer.id,
          type: "PICKUP",
          items: [{ productId: product.id, quantity: 1 }],
          deliveryFee: 0,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().total).toBe(4000);
    });

    it("deve rejeitar DELIVERY sem endereço (400)", async () => {
      const { restaurant, product, customer } = await createDeps();

      const response = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customerId: customer.id,
          type: "DELIVERY",
          items: [{ productId: product.id, quantity: 1 }],
          deliveryFee: 500,
        },
      });

      expect(response.statusCode).toBe(400); // Falha de domínio/schema
    });

    it("deve rejeitar restaurante ou cliente inexistente (404)", async () => {
      const { restaurant, product } = await createDeps();

      const response = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customerId: randomUUID(),
          type: "PICKUP",
          items: [{ productId: product.id, quantity: 1 }],
          deliveryFee: 0,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("deve rejeitar quantidade negativa via Zod (400)", async () => {
      const { restaurant, product, customer } = await createDeps();

      const response = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customerId: customer.id,
          type: "PICKUP",
          items: [{ productId: product.id, quantity: -5 }],
          deliveryFee: 0,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
