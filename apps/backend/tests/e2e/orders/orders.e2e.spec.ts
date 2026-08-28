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
  tables,
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
    await db.delete(tables);
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
      .values({ name: "Maria", phone: "11900000000", email: "a@a.com" })
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
          customer: {
            name: customer.name,
            phone: "(11) 90000-0000",
            email: customer.email,
          },
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
          customer: { name: customer.name, phone: "11 90000-0000" },
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
          customer: { name: customer.name, phone: "11 90000-0000" },
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
          customer: { name: customer.name, phone: "11 90000-0000" },
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
          customer: { name: customer.name, phone: "11 90000-0000" },
          type: "PICKUP",
          items: [{ productId: product.id, quantity: -5 }],
          deliveryFee: 0,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("deve exigir exatamente customerId ou customer (400)", async () => {
      const { restaurant, product, customer } = await createDeps();
      const basePayload = {
        type: "PICKUP",
        items: [{ productId: product.id, quantity: 1 }],
        deliveryFee: 0,
      };

      const withoutCustomer = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: basePayload,
      });
      const withBoth = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          ...basePayload,
          customerId: customer.id,
          customer: { name: "Maria", phone: "11900000000" },
        },
      });

      expect(withoutCustomer.statusCode).toBe(400);
      expect(withBoth.statusCode).toBe(400);
    });

    it("deve reutilizar customer global entre restaurantes e ocultar customerId cross-tenant", async () => {
      const first = await createDeps();
      const firstOrder = await app.inject({
        method: "POST",
        url: `/restaurants/${first.restaurant.id}/orders`,
        payload: {
          customer: { name: "Original", phone: "(11) 98888-7777" },
          type: "PICKUP",
          items: [{ productId: first.product.id, quantity: 1 }],
          deliveryFee: 0,
        },
      });
      const secondRestaurant = (
        await app.inject({
          method: "POST",
          url: "/restaurants",
          payload: {
            name: "Outro",
            address: "Rua",
            phone: "22",
            timezone: "UTC",
          },
        })
      ).json();
      const secondCategory = (
        await app.inject({
          method: "POST",
          url: `/restaurants/${secondRestaurant.id}/product-categories`,
          payload: { name: "Pizza" },
        })
      ).json();
      const secondProduct = (
        await app.inject({
          method: "POST",
          url: `/restaurants/${secondRestaurant.id}/products`,
          payload: {
            categoryId: secondCategory.id,
            name: "Mussarela",
            price: 3500,
          },
        })
      ).json();

      const crossTenantId = await app.inject({
        method: "POST",
        url: `/restaurants/${secondRestaurant.id}/orders`,
        payload: {
          customerId: firstOrder.json().customerId,
          type: "PICKUP",
          items: [{ productId: secondProduct.id, quantity: 1 }],
          deliveryFee: 0,
        },
      });
      const globalReuse = await app.inject({
        method: "POST",
        url: `/restaurants/${secondRestaurant.id}/orders`,
        payload: {
          customer: {
            name: "Nome não deve substituir",
            phone: "11 98888.7777",
          },
          type: "PICKUP",
          items: [{ productId: secondProduct.id, quantity: 1 }],
          deliveryFee: 0,
        },
      });
      const relatedId = await app.inject({
        method: "POST",
        url: `/restaurants/${secondRestaurant.id}/orders`,
        payload: {
          customerId: firstOrder.json().customerId,
          type: "PICKUP",
          items: [{ productId: secondProduct.id, quantity: 1 }],
          deliveryFee: 0,
        },
      });
      const tenantAwareCustomer = await app.inject({
        method: "GET",
        url: `/restaurants/${first.restaurant.id}/customers/${firstOrder.json().customerId}`,
      });

      expect(firstOrder.statusCode).toBe(201);
      expect(crossTenantId.statusCode).toBe(404);
      expect(globalReuse.statusCode).toBe(201);
      expect(relatedId.statusCode).toBe(201);
      expect(tenantAwareCustomer.statusCode).toBe(200);
      expect(globalReuse.json()).toMatchObject({
        customerId: firstOrder.json().customerId,
        customerName: "Original",
        customerPhone: "11988887777",
      });
      const canonicalCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, "11988887777"));
      expect(canonicalCustomers).toHaveLength(1);
      expect(canonicalCustomers[0].name).toBe("Original");
      expect(globalReuse.json()).not.toHaveProperty("created");
      expect(globalReuse.json()).not.toHaveProperty("reused");
    });

    it("deve convergir criações concorrentes para um único customer", async () => {
      const { restaurant, product } = await createDeps();
      const payload = {
        customer: { name: "Concorrente", phone: "(11) 97777-6666" },
        type: "PICKUP",
        items: [{ productId: product.id, quantity: 1 }],
        deliveryFee: 0,
      };

      const responses = await Promise.all([
        app.inject({
          method: "POST",
          url: `/restaurants/${restaurant.id}/orders`,
          payload,
        }),
        app.inject({
          method: "POST",
          url: `/restaurants/${restaurant.id}/orders`,
          payload,
        }),
      ]);

      expect(responses.map((response) => response.statusCode)).toEqual([
        201, 201,
      ]);
      expect(responses[0].json().customerId).toBe(
        responses[1].json().customerId,
      );
      const matchingCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, "11977776666"));
      expect(matchingCustomers).toHaveLength(1);
    });

    it("deve reverter customer novo quando uma falha posterior aborta o pedido", async () => {
      const { restaurant, product } = await createDeps();
      const table = (
        await app.inject({
          method: "POST",
          url: `/restaurants/${restaurant.id}/tables`,
          payload: { number: 1, capacity: 4, type: "table" },
        })
      ).json();
      const first = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customer: { name: "Primeiro", phone: "11911112222" },
          type: "DINE_IN",
          tableId: table.id,
          items: [{ productId: product.id, quantity: 1 }],
          deliveryFee: 0,
        },
      });
      const rejected = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/orders`,
        payload: {
          customer: { name: "Rollback", phone: "(11) 92222-3333" },
          type: "DINE_IN",
          tableId: table.id,
          items: [{ productId: product.id, quantity: 1 }],
          deliveryFee: 0,
        },
      });

      expect(first.statusCode).toBe(201);
      expect(rejected.statusCode).toBe(409);
      const rolledBackCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, "11922223333"));
      expect(rolledBackCustomers).toHaveLength(0);
      expect(await db.select().from(orders)).toHaveLength(1);
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
      const body = response.json();
      expect(body.data).toHaveLength(20);
      expect(
        body.data.map(({ order }: { order: { id: string } }) => order.id),
      ).toEqual(createdOrders.slice(0, 20).map((order) => order.id));
      expect(body.meta).toEqual({
        page: 1,
        limit: 20,
        total: 21,
        totalPages: 2,
        hasNext: true,
        hasPrevious: false,
      });
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
      const body = response.json();
      expect(body.data).toHaveLength(2);
      expect(
        body.data.map(({ order }: { order: { id: string } }) => order.id),
      ).toEqual(createdOrders.slice(2, 4).map((order) => order.id));
      expect(body.data[0].items).toHaveLength(1);
      expect(body.data[0].items[0]).toMatchObject({
        orderId: pagedOrder.id,
        productId: product.id,
        productName: product.name,
        addons: [],
      });
      expect(body.meta).toEqual({
        page: 2,
        limit: 2,
        total: 5,
        totalPages: 3,
        hasNext: true,
        hasPrevious: true,
      });
    });

    it("deve retornar uma lista vazia para uma página além do conjunto", async () => {
      const { restaurant } = await createListFixtures(3);

      const response = await app.inject({
        method: "GET",
        url: `/restaurants/${restaurant.id}/orders?page=3&limit=2`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        data: [],
        meta: {
          page: 3,
          limit: 2,
          total: 3,
          totalPages: 2,
          hasNext: false,
          hasPrevious: true,
        },
      });
    });

    it("deve retornar metadata consistente quando não existem pedidos", async () => {
      const { restaurant } = await createDeps();

      const response = await app.inject({
        method: "GET",
        url: `/restaurants/${restaurant.id}/orders`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        data: [],
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      });
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
      const body = response.json();
      expect(
        body.data.map(({ order }: { order: { id: string } }) => order.id),
      ).toEqual(confirmedOrders.slice(2, 4).map((order) => order.id));
      expect(body.meta).toEqual({
        page: 2,
        limit: 2,
        total: 4,
        totalPages: 2,
        hasNext: false,
        hasPrevious: true,
      });
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
