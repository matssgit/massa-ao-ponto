import {
  addons,
  customers,
  deliveries,
  deliveryHistory,
  orderHistory,
  orderItemAddons,
  orderItems,
  orders,
  productAddons,
  productCategories,
  products,
  restaurants,
} from "../../../src/db/schema/index.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

describe("Orders (E2E)", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.delete(deliveryHistory);
    await db.delete(deliveries);
    await db.delete(orderHistory);
    await db.delete(orderItemAddons);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(productAddons);
    await db.delete(products);
    await db.delete(addons);
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

    const addonRes = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/addons`,
      payload: { name: "Borda Recheada", price: 1000 },
    });
    const addon = addonRes.json();

    await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/products/${product.id}/addons/${addon.id}`,
    });

    const [customer] = await db
      .insert(customers)
      .values({ name: "Maria", phone: "11999", email: "a@a.com" })
      .returning();

    return { restaurant, category, product, addon, customer };
  }

  async function createListFixtures(count: number) {
    const { restaurant, product, customer } = await createDeps();
    const referenceDate = new Date("2026-08-26T12:00:00.000Z");
    const rows: Array<typeof orders.$inferInsert> = Array.from(
      { length: count },
      (_, index) => ({
        id: randomUUID(),
        restaurantId: restaurant.id,
        customerId: customer.id,
        type: index % 2 === 0 ? "PICKUP" : "DELIVERY",
        status: index % 2 === 0 ? "CONFIRMED" : "PENDING",
        paymentStatus: "PENDING",
        subtotal: 4000,
        deliveryFee: 0,
        total: 4000,
        customerName: customer.name,
        customerPhone: customer.phone,
        deliveryStreet: null,
        deliveryNumber: null,
        deliveryComplement: null,
        deliveryNeighborhood: null,
        deliveryCity: null,
        deliveryState: null,
        deliveryZipCode: null,
        observation: null,
        createdAt: new Date(referenceDate.getTime() - index * 1000),
        updatedAt: new Date(referenceDate.getTime() - index * 1000),
      }),
    );

    const createdOrders = await db.insert(orders).values(rows).returning();
    createdOrders.sort((a, b) => {
      const dateDiff = b.createdAt.getTime() - a.createdAt.getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.id.localeCompare(a.id);
    });

    return { restaurant, product, createdOrders };
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
          items: [{ productId: product.id, quantity: 2 }],
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
      expect(order.total).toBe(8500);
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

    it("deve criar um pedido com múltiplos addons, validar cálculo e atestar persistência física no DB (201)", async () => {
      const { restaurant, product, addon, customer } = await createDeps();
      
      const addon2Res = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/addons`,
        payload: { name: "Bacon", price: 500 },
      });
      const addon2 = addon2Res.json();

      await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/products/${product.id}/addons/${addon2.id}`,
      });

      const response = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customerId: customer.id,
          type: "PICKUP",
          items: [
            {
              productId: product.id,
              quantity: 2,
              addons: [
                { addonId: addon.id, quantity: 1 },
                { addonId: addon2.id, quantity: 3 },
              ],
            },
          ],
          deliveryFee: 0,
        },
      });

      expect(response.statusCode).toBe(201);
      const order = response.json();

      expect(order.subtotal).toBe(10500);

      const orderItemsDb = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      
      expect(orderItemsDb).toHaveLength(1);

      const addonsDb = await db
        .select()
        .from(orderItemAddons)
        .where(eq(orderItemAddons.orderItemId, orderItemsDb[0].id));
      
      expect(addonsDb).toHaveLength(2);

      const bordaAddon = addonsDb.find((a) => a.addonId === addon.id);
      expect(bordaAddon).toBeDefined();
      expect(bordaAddon?.addonName).toBe("Borda Recheada");
      expect(bordaAddon?.unitPrice).toBe(1000);
      expect(bordaAddon?.quantity).toBe(1);
      expect(bordaAddon?.subtotal).toBe(1000);
      expect(bordaAddon?.orderItemId).toBe(orderItemsDb[0].id);

      const baconAddon = addonsDb.find((a) => a.addonId === addon2.id);
      expect(baconAddon).toBeDefined();
      expect(baconAddon?.addonName).toBe("Bacon");
      expect(baconAddon?.unitPrice).toBe(500);
      expect(baconAddon?.quantity).toBe(3);
      expect(baconAddon?.subtotal).toBe(1500);
      expect(baconAddon?.orderItemId).toBe(orderItemsDb[0].id);
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

      expect(response.statusCode).toBe(400);
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

  describe("GET /restaurants/:restaurantId/orders", () => {
    it("deve usar page=1 e limit=20 por padrão e preservar a ordenação", async () => {
      const { restaurant, createdOrders } = await createListFixtures(21);

      const response = await app.inject({
        method: "GET",
        url: `/restaurants/${restaurant.id}/orders`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveLength(20);
      expect(data.map(({ order }: { order: { id: string } }) => order.id)).toEqual(
        createdOrders.slice(0, 20).map((order) => order.id),
      );
    });

    it("deve retornar o segundo conjunto, respeitar o limit e hidratar itens", async () => {
      const { restaurant, product, createdOrders } =
        await createListFixtures(5);
      const pagedOrder = createdOrders[2];

      await db.insert(orderItems).values({
        orderId: pagedOrder.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: 1,
        subtotal: product.price,
      });

      const response = await app.inject({
        method: "GET",
        url: `/restaurants/${restaurant.id}/orders?page=2&limit=2`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveLength(2);
      expect(data.map(({ order }: { order: { id: string } }) => order.id)).toEqual(
        createdOrders.slice(2, 4).map((order) => order.id),
      );
      expect(data[0].items).toHaveLength(1);
      expect(data[0].items[0]).toMatchObject({
        orderId: pagedOrder.id,
        productId: product.id,
        productName: product.name,
      });
    });

    it("deve retornar uma lista vazia para uma página além do conjunto", async () => {
      const { restaurant } = await createListFixtures(3);

      const response = await app.inject({
        method: "GET",
        url: `/restaurants/${restaurant.id}/orders?page=3&limit=2`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });

    it("deve combinar paginação com filtros existentes", async () => {
      const { restaurant, createdOrders } = await createListFixtures(8);
      const confirmedOrders = createdOrders.filter(
        (order) => order.status === "CONFIRMED",
      );

      const response = await app.inject({
        method: "GET",
        url: `/restaurants/${restaurant.id}/orders?status=CONFIRMED&page=2&limit=2`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.map(({ order }: { order: { id: string } }) => order.id)).toEqual(
        confirmedOrders.slice(2, 4).map((order) => order.id),
      );
    });

    it.each(["page=0", "limit=0", "limit=101"])(
      "deve rejeitar a query inválida %s",
      async (query) => {
        const response = await app.inject({
          method: "GET",
          url: `/restaurants/${randomUUID()}/orders?${query}`,
        });

        expect(response.statusCode).toBe(400);
      },
    );
  });
});
