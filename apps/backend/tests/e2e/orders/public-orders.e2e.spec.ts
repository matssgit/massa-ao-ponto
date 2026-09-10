import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import {
  addons, customers, deliveries, deliveryHistory, orderHistory, orders, productAddons, productCategories,
  products, restaurants,
} from "../../../src/db/schema/index.js";
import { hashPublicOrderToken } from "../../../src/modules/orders/public-order-tokens.js";
import { DrizzleOrderHistoryRepository } from "../../../src/modules/orders/repositories/drizzle-order-history-repository.js";
import { DrizzleDeliveryHistoryRepository } from "../../../src/modules/orders/repositories/drizzle-delivery-history-repository.js";
import { nextAuthClientAddress, useTestAuth } from "../../helpers/auth.js";

const auth = useTestAuth(app);
const headers = { origin: "http://localhost:5173", "x-auth-request": "1" };
let restaurant: typeof restaurants.$inferSelect;
let otherRestaurant: typeof restaurants.$inferSelect;
let product: typeof products.$inferSelect;
let addon: typeof addons.$inferSelect;
let remoteAddress: string;
const customerPhones = new Set<string>();

function nextPhone() {
  const phone = "55" + String(Math.floor(Math.random() * 1e11)).padStart(11, "0");
  customerPhones.add(phone);
  return phone;
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    type: "PICKUP",
    customer: { name: "Public customer", phone: nextPhone(), email: "public@example.test" },
    items: [{ productId: product.id, quantity: 2, addons: [{ addonId: addon.id, quantity: 1 }] }],
    observation: "Sem cebola",
    ...overrides,
  };
}

function create(body = payload()) {
  return app.inject({
    method: "POST",
    url: `/public/restaurants/${restaurant.slug}/orders`,
    headers,
    remoteAddress,
    payload: body,
  });
}

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => {
  remoteAddress = nextAuthClientAddress();
  restaurant = await auth.createRestaurant({
    name: "Public pickup", address: "Main street", slug: "pickup-" + randomUUID(), publicEnabled: true,
  });
  otherRestaurant = await auth.createRestaurant({
    name: "Other pickup", address: "Other street", slug: "other-" + randomUUID(), publicEnabled: true,
  });
  const [category] = await db.insert(productCategories).values({
    restaurantId: restaurant.id, name: "Pizzas",
  }).returning();
  [product] = await db.insert(products).values({
    restaurantId: restaurant.id, categoryId: category.id, name: "Margherita", price: 4000,
  }).returning();
  [addon] = await db.insert(addons).values({
    restaurantId: restaurant.id, name: "Borda", price: 700,
  }).returning();
  await db.insert(productAddons).values({ productId: product.id, addonId: addon.id });
});
afterEach(async () => {
  vi.restoreAllMocks();
  const related = await db.select({ customerId: orders.customerId }).from(orders)
    .where(inArray(orders.restaurantId, [restaurant.id, otherRestaurant.id]));
  await db.delete(orders).where(inArray(orders.restaurantId, [restaurant.id, otherRestaurant.id]));
  const customerIds = [...new Set(related.map(({ customerId }) => customerId))];
  if (customerIds.length > 0) await db.delete(customers).where(inArray(customers.id, customerIds));
  if (customerPhones.size > 0) await db.delete(customers).where(inArray(customers.phone, [...customerPhones]));
  customerPhones.clear();
  await db.delete(restaurants).where(inArray(restaurants.id, [restaurant.id, otherRestaurant.id]));
});

describe("Public PICKUP orders", () => {
  it("calculates server-owned totals, stores only the token hash and returns a minimal reusable lookup", async () => {
    const phone = nextPhone();
    const [existing] = await db.insert(customers).values({
      name: "Existing private name", phone, email: "private@example.test",
    }).returning();
    const response = await create(payload({
      customer: { name: "Supplied name", phone },
    }));
    expect(response.statusCode).toBe(201);
    const body = response.json<{ accessToken: string; order: { total: number }; items: unknown[]; delivery: null }>();
    expect(body.accessToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body.order).toMatchObject({
      status: "PENDING", type: "PICKUP", paymentStatus: "PENDING",
      subtotal: 8700, deliveryFee: 0, total: 8700,
    });
    expect(body.items).toEqual([{
      productName: "Margherita", unitPrice: 4000, quantity: 2, subtotal: 8700,
      addons: [{ addonName: "Borda", unitPrice: 700, quantity: 1, subtotal: 700 }],
    }]);
    const [stored] = await db.select().from(orders).where(eq(orders.restaurantId, restaurant.id));
    expect(stored.publicAccessTokenHash).toBe(hashPublicOrderToken(body.accessToken));
    expect(JSON.stringify(stored)).not.toContain(body.accessToken);
    expect(response.body).not.toMatch(/customer|restaurantId|orderId|productId|addonId|Hash/);
    const [unchanged] = await db.select().from(customers).where(eq(customers.id, existing.id));
    expect(unchanged).toEqual(existing);
    for (let index = 0; index < 2; index++) {
      const lookup = await app.inject({ url: `/public/orders/${body.accessToken}`, remoteAddress });
      expect(lookup.statusCode).toBe(200);
      expect(lookup.json()).toEqual({ order: body.order, items: body.items, delivery: body.delivery });
    }
    const admin = await app.inject({
      url: `/restaurants/${restaurant.id}/orders/${stored.id}`,
      headers: auth.headers,
    });
    expect(admin.body).not.toContain("publicAccessTokenHash");
  });

  it("requires publication, PICKUP and a strict server-owned financial contract", async () => {
    await db.update(restaurants).set({ publicEnabled: false }).where(eq(restaurants.id, restaurant.id));
    const hidden = await create();
    const missing = await app.inject({
      method: "POST", url: "/public/restaurants/missing/orders", headers,
      remoteAddress: nextAuthClientAddress(), payload: payload(),
    });
    expect(hidden.statusCode).toBe(404);
    expect(hidden.json()).toEqual(missing.json());
    await db.update(restaurants).set({ publicEnabled: true }).where(eq(restaurants.id, restaurant.id));
    for (const body of [
      payload({ type: "DELIVERY" }),
      payload({ type: "DINE_IN" }),
      payload({ total: 1 }),
      payload({ subtotal: 1 }),
      payload({ deliveryFee: 0 }),
      payload({ paymentStatus: "PAID" }),
      payload({ customerId: randomUUID() }),
      payload({ tableId: randomUUID() }),
      payload({ deliveryAddress: { street: "x" } }),
    ]) {
      expect((await create(body)).statusCode).toBe(400);
    }
    expect(await db.select().from(orders).where(eq(orders.restaurantId, restaurant.id))).toEqual([]);
  });

  it("creates DELIVERY atomically with the Restaurant fee and exposes safe delivery details", async () => {
    await db.update(restaurants).set({
      deliveryEnabled: true,
      deliveryFeeCents: 1200,
    }).where(eq(restaurants.id, restaurant.id));
    const deliveryAddress = {
      street: "Rua das Flores",
      number: "42",
      complement: "Apto 3",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "sp",
      zipCode: "01001-000",
    };

    const response = await create(payload({ type: "DELIVERY", deliveryAddress }));
    expect(response.statusCode).toBe(201);
    const body = response.json<{ accessToken: string; order: { deliveryFee: number; total: number }; delivery: { status: string } }>();
    expect(body.order).toMatchObject({
      type: "DELIVERY",
      subtotal: 8700,
      deliveryFee: 1200,
      total: 9900,
      deliveryAddress: { ...deliveryAddress, state: "SP" },
    });
    expect(body.delivery).toEqual({ status: "PENDING" });

    const [storedOrder] = await db.select().from(orders).where(eq(orders.restaurantId, restaurant.id));
    const [storedDelivery] = await db.select().from(deliveries).where(eq(deliveries.orderId, storedOrder.id));
    expect(storedDelivery).toMatchObject({ orderId: storedOrder.id, status: "PENDING" });
    expect(await db.select().from(deliveryHistory).where(eq(deliveryHistory.deliveryId, storedDelivery.id))).toHaveLength(1);
    expect((await app.inject({ url: `/public/orders/${body.accessToken}`, remoteAddress })).json()).toMatchObject({
      order: { type: "DELIVERY", deliveryFee: 1200, total: 9900 },
      delivery: { status: "PENDING" },
    });
  });

  it("rejects disabled DELIVERY, missing address and client-owned fee fields", async () => {
    const address = {
      street: "Rua A", number: "1", neighborhood: "Centro",
      city: "São Paulo", state: "SP", zipCode: "01001000",
    };
    expect((await create(payload({ type: "DELIVERY", deliveryAddress: address }))).statusCode).toBe(409);
    await db.update(restaurants).set({ deliveryEnabled: true, deliveryFeeCents: 900 }).where(eq(restaurants.id, restaurant.id));
    expect((await create(payload({ type: "DELIVERY" }))).statusCode).toBe(400);
    expect((await create(payload({ type: "DELIVERY", deliveryAddress: address, deliveryFee: 1 }))).statusCode).toBe(400);
    expect(await db.select().from(orders).where(eq(orders.restaurantId, restaurant.id))).toEqual([]);
  });

  it("enforces all public payload limits before creating an Order", async () => {
    const validItem = { productId: product.id, quantity: 1 };
    const invalidBodies = [
      payload({ customer: { name: "n".repeat(121), phone: nextPhone() } }),
      payload({ customer: { name: "Name", phone: "1".repeat(31) } }),
      payload({ customer: { name: "Name", phone: nextPhone(), email: "a".repeat(250) + "@x.test" } }),
      payload({ observation: "o".repeat(501) }),
      payload({ items: Array.from({ length: 21 }, () => validItem) }),
      payload({ items: [{ ...validItem, quantity: 21 }] }),
      payload({ items: [{ ...validItem, addons: Array.from({ length: 11 }, () => ({ addonId: addon.id, quantity: 1 })) }] }),
      payload({ items: [{ ...validItem, addons: [{ addonId: addon.id, quantity: 21 }] }] }),
    ];
    for (const body of invalidBodies) {
      expect((await create(body)).statusCode).toBe(400);
    }
    const oversized = await app.inject({
      method: "POST", url: `/public/restaurants/${restaurant.slug}/orders`, headers,
      remoteAddress: nextAuthClientAddress(),
      payload: { ...payload(), ignored: "x".repeat(17000) },
    });
    expect(oversized.statusCode).toBe(413);
    expect(await db.select().from(orders).where(eq(orders.restaurantId, restaurant.id))).toEqual([]);
  });

  it("blocks inactive and cross-tenant Products/Addons", async () => {
    const [otherCategory] = await db.insert(productCategories).values({
      restaurantId: otherRestaurant.id, name: "Other",
    }).returning();
    const [otherProduct] = await db.insert(products).values({
      restaurantId: otherRestaurant.id, categoryId: otherCategory.id, name: "Other", price: 1,
    }).returning();
    const [otherAddon] = await db.insert(addons).values({
      restaurantId: otherRestaurant.id, name: "Other", price: 1,
    }).returning();
    await db.update(products).set({ active: false }).where(eq(products.id, product.id));
    expect((await create(payload({ items: [{ productId: product.id, quantity: 1 }] }))).statusCode).toBe(409);
    await db.update(products).set({ active: true }).where(eq(products.id, product.id));
    expect((await create(payload({ items: [{ productId: otherProduct.id, quantity: 1 }] }))).statusCode).toBe(409);
    await db.update(addons).set({ active: false }).where(eq(addons.id, addon.id));
    expect((await create()).statusCode).toBe(409);
    await db.update(addons).set({ active: true }).where(eq(addons.id, addon.id));
    expect((await create(payload({
      items: [{ productId: product.id, quantity: 1, addons: [{ addonId: otherAddon.id, quantity: 1 }] }],
    }))).statusCode).toBe(409);
    expect(await db.select().from(orders).where(eq(orders.restaurantId, restaurant.id))).toEqual([]);
  });

  it("uses only the token for lookup/cancel, preserves it, rejects PAID and serializes cancellation", async () => {
    const created = await create();
    const token = created.json<{ accessToken: string }>().accessToken;
    const [stored] = await db.select().from(orders).where(eq(orders.restaurantId, restaurant.id));
    const unknown = "z".repeat(43);
    expect((await app.inject({ url: `/public/orders/${stored.id}`, remoteAddress })).statusCode).toBe(404);
    expect((await app.inject({ url: `/public/orders/${unknown}`, remoteAddress })).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: `/public/orders/${unknown}/cancel`, headers, remoteAddress })).statusCode).toBe(404);
    const cancellations = await Promise.all([1, 2].map(() => app.inject({
      method: "POST", url: `/public/orders/${token}/cancel`, headers, remoteAddress,
    })));
    expect(cancellations.map((response) => response.statusCode).sort()).toEqual([200, 409]);
    expect((await app.inject({ url: `/public/orders/${token}`, remoteAddress })).json().order.status).toBe("CANCELLED");
    const [after] = await db.select().from(orders).where(eq(orders.id, stored.id));
    expect(after.publicAccessTokenHash).toBe(stored.publicAccessTokenHash);
    expect(await db.select().from(orderHistory).where(eq(orderHistory.orderId, stored.id))).toHaveLength(2);

    const paid = await create();
    const paidToken = paid.json<{ accessToken: string }>().accessToken;
    const [paidOrder] = await db.select().from(orders).where(eq(orders.publicAccessTokenHash, hashPublicOrderToken(paidToken)));
    await db.update(orders).set({ paymentStatus: "PAID" }).where(eq(orders.id, paidOrder.id));
    expect((await app.inject({
      method: "POST", url: `/public/orders/${paidToken}/cancel`, headers, remoteAddress,
    })).statusCode).toBe(409);
    expect((await app.inject({ url: `/public/orders/${paidToken}`, remoteAddress })).json().order.paymentStatus).toBe("PAID");
  });

  it("rolls back Customer, Order, items and token when history persistence fails", async () => {
    const phone = nextPhone();
    vi.spyOn(DrizzleOrderHistoryRepository.prototype, "create").mockRejectedValueOnce(new Error("sensitive persistence detail"));
    const response = await create(payload({ customer: { name: "Rollback", phone } }));
    expect(response.statusCode).toBe(500);
    expect(await db.select().from(orders).where(eq(orders.restaurantId, restaurant.id))).toEqual([]);
    expect(await db.select().from(customers).where(eq(customers.phone, phone))).toEqual([]);
  });

  it("rolls back the complete DELIVERY aggregate when delivery history persistence fails", async () => {
    await db.update(restaurants).set({ deliveryEnabled: true, deliveryFeeCents: 500 }).where(eq(restaurants.id, restaurant.id));
    const phone = nextPhone();
    vi.spyOn(DrizzleDeliveryHistoryRepository.prototype, "create").mockRejectedValueOnce(new Error("delivery history failure"));
    const response = await create(payload({
      type: "DELIVERY",
      customer: { name: "Rollback delivery", phone },
      deliveryAddress: {
        street: "Rua A", number: "1", neighborhood: "Centro",
        city: "São Paulo", state: "SP", zipCode: "01001000",
      },
    }));
    expect(response.statusCode).toBe(500);
    expect(await db.select().from(orders).where(eq(orders.restaurantId, restaurant.id))).toEqual([]);
    expect(await db.select().from(customers).where(eq(customers.phone, phone))).toEqual([]);
  });
});
