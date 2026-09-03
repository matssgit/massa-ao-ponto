import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import fastify, { type FastifyInstance } from "fastify";
import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import {
  customers, orders, products, productCategories, restaurants,
  sessions, tables, users,
} from "../../../src/db/schema/index.js";
import { TestAuth, useTestAuth } from "../../helpers/auth.js";
import { registerAuthorization } from "../../../src/modules/auth/authorization.js";
import { errorHandler } from "../../../src/http/error-handler.js";

type TestMethod = "GET" | "POST" | "PATCH" | "DELETE";

describe("Tenant authorization (E2E)", () => {
  const auth = useTestAuth(app);
  let restaurantId: string;
  let otherRestaurantId: string;
  let extraAuth: TestAuth | undefined;
  let isolatedApp: FastifyInstance | undefined;
  const fixtureIds: string[] = [];
  const customerIds: string[] = [];

  beforeAll(async () => { await app.ready(); });
  afterAll(async () => { await app.close(); });
  beforeEach(async () => {
    const restaurant = await auth.createRestaurant({ name: "Authorized", address: "Test", timezone: "UTC" });
    restaurantId = restaurant.id;
    const [other] = await db.insert(restaurants).values({ name: "Other", address: "Test", timezone: "UTC" }).returning();
    otherRestaurantId = other.id;
    fixtureIds.push(restaurantId, otherRestaurantId);
  });
  afterEach(async () => {
    await isolatedApp?.close();
    isolatedApp = undefined;
    await extraAuth?.cleanup();
    extraAuth = undefined;
    if (fixtureIds.length) {
      await db.delete(orders).where(inArray(orders.restaurantId, fixtureIds));
      await db.delete(restaurants).where(inArray(restaurants.id, fixtureIds));
    }
    if (customerIds.length) await db.delete(customers).where(inArray(customers.id, customerIds));
    fixtureIds.length = 0;
    customerIds.length = 0;
  });

  function url(suffix = "") { return "/restaurants/" + restaurantId + suffix; }

  const ownerRoutes: Array<[TestMethod, string]> = [
    ["PATCH", ""],
    ["POST", "/tables"], ["PATCH", "/tables/:id"],
    ["POST", "/products"], ["PATCH", "/products/:id"], ["DELETE", "/products/:id"],
    ["PATCH", "/products/:id/toggle-status"],
    ["POST", "/product-categories"], ["PATCH", "/product-categories/:id"],
    ["DELETE", "/product-categories/:id"], ["PATCH", "/product-categories/:id/toggle-status"],
    ["POST", "/addons"], ["PATCH", "/addons/:id"], ["DELETE", "/addons/:id"],
    ["PATCH", "/addons/:id/toggle-status"],
    ["POST", "/products/:id/addons/:addonId"], ["DELETE", "/products/:id/addons/:addonId"],
    ["PATCH", "/orders/:id/payment"],
    ["GET", "/dashboard/sales-summary"], ["GET", "/dashboard/top-products"],
    ["GET", "/dashboard/top-customers"], ["GET", "/dashboard/category-performance"],
  ];

  it("rejects unauthenticated requests across all administrative areas", async () => {
    const routes: Array<[TestMethod, string]> = [
      ["GET", "/restaurants"], ["POST", "/restaurants"], ["GET", url()], ["PATCH", url()],
      ["GET", url("/orders")], ["POST", url("/reservations")], ["GET", url("/customers")],
      ["POST", url("/orders/" + randomUUID() + "/delivery")], ["GET", url("/tables")],
      ["GET", url("/products")], ["GET", url("/addons")],
      ["GET", url("/product-categories")], ["GET", url("/dashboard/top-products")],
      ["POST", "/auth/logout"],
    ];
    for (const [method, endpoint] of routes) {
      const response = await app.inject({ method, url: endpoint });
      expect(response.statusCode, endpoint).toBe(401);
      expect(response.json()).toEqual({ code: "UNAUTHENTICATED", message: "Authentication required." });
    }
  });

  it("authorizes an active membership and hides cross-tenant existence", async () => {
    expect((await app.inject({ method: "GET", url: url(), headers: auth.headers })).statusCode).toBe(200);
    for (const id of [otherRestaurantId, randomUUID()]) {
      const response = await app.inject({ method: "GET", url: "/restaurants/" + id, headers: auth.headers });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ code: "RESTAURANT_NOT_FOUND", message: "Restaurant not found." });
    }
  });

  it("does not trust client-supplied identity, tenant or role", async () => {
    const response = await app.inject({
      method: "PATCH", url: "/restaurants/" + otherRestaurantId,
      headers: { ...auth.headers, "x-user-id": auth.userId, "x-role": "OWNER", "x-restaurant-id": restaurantId },
      payload: { name: "Not allowed", userId: auth.userId, restaurantId, role: "OWNER" },
    });
    expect(response.statusCode).toBe(404);
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, otherRestaurantId));
    expect(restaurant.name).toBe("Other");
  });

  it("rechecks membership activity and role on every request", async () => {
    await auth.grant(restaurantId, "STAFF");
    const denied = await app.inject({ method: "PATCH", url: url(), headers: auth.headers, payload: { name: "No" } });
    expect(denied.statusCode).toBe(403);
    await auth.grant(restaurantId, "OWNER");
    expect((await app.inject({ method: "PATCH", url: url(), headers: auth.headers, payload: { name: "Yes" } })).statusCode).toBe(200);
    await auth.grant(restaurantId, "OWNER", false);
    expect((await app.inject({ method: "GET", url: url(), headers: auth.headers })).statusCode).toBe(404);
  });

  it("lists only active memberships, including STAFF, with deterministic order", async () => {
    await auth.grant(otherRestaurantId, "STAFF");
    const [inactive] = await db.insert(restaurants).values({ name: "A inactive", address: "Test" }).returning();
    fixtureIds.push(inactive.id);
    await auth.grant(inactive.id, "OWNER", false);
    const response = await app.inject({ method: "GET", url: "/restaurants", headers: auth.headers });
    expect(response.statusCode).toBe(200);
    expect(response.json<Array<{ id: string }>>().map((row) => row.id)).toEqual([restaurantId, otherRestaurantId]);
    extraAuth = new TestAuth(app);
    await extraAuth.login();
    expect((await app.inject({ method: "GET", url: "/restaurants", headers: extraAuth.headers })).json()).toEqual([]);
    await extraAuth.grant(otherRestaurantId);
    expect((await app.inject({ method: "GET", url: "/restaurants", headers: extraAuth.headers })).json<Array<{ id: string }>>()
      .map((row) => row.id)).toEqual([otherRestaurantId]);
  });

  it.each(ownerRoutes)("denies STAFF on OWNER-only %s %s", async (method, suffix) => {
    await auth.grant(restaurantId, "STAFF");
    const endpoint = url(suffix.replaceAll(":id", randomUUID()).replace(":addonId", randomUUID()));
    const before = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
    const response = await app.inject({ method, url: endpoint, headers: auth.headers });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ code: "FORBIDDEN", message: "Access denied." });
    expect(await db.select().from(restaurants).where(eq(restaurants.id, restaurantId))).toEqual(before);
  });

  it("allows STAFF operational reads, including HEAD, tables, catalog and customers", async () => {
    await auth.grant(restaurantId, "STAFF");
    for (const suffix of ["", "/orders", "/reservations", "/customers", "/tables", "/products", "/product-categories", "/addons"]) {
      const response = await app.inject({ method: "GET", url: url(suffix), headers: auth.headers });
      expect(response.statusCode, suffix).toBe(200);
    }
    expect((await app.inject({ method: "HEAD", url: url("/orders"), headers: auth.headers })).statusCode).toBe(200);
  });

  it("allows OWNER administration and STAFF to create a Reservation", async () => {
    const created = await app.inject({
      method: "POST", url: url("/tables"), headers: auth.headers,
      payload: { number: 1, capacity: 4, type: "table" },
    });
    expect(created.statusCode).toBe(201);
    const table = created.json<{ id: string }>();
    await auth.grant(restaurantId, "STAFF");
    const phone = "5511" + Date.now();
    const reservation = await app.inject({
      method: "POST", url: url("/reservations"), headers: auth.headers,
      payload: { tableId: table.id, customer: { name: "Authorization fixture", phone },
        people: 2, startsAt: new Date(Date.now() + 3_600_000).toISOString(),
        endsAt: new Date(Date.now() + 7_200_000).toISOString() },
    });
    expect(reservation.statusCode).toBe(201);
    customerIds.push(reservation.json<{ customerId: string }>().customerId);
  });

  it("allows STAFF to create/operate an Order but only OWNER to confirm payment", async () => {
    const [category] = await db.insert(productCategories).values({ restaurantId, name: "Pizza" }).returning();
    const [product] = await db.insert(products).values({ restaurantId, categoryId: category.id, name: "Pizza", price: 1000 }).returning();
    await auth.grant(restaurantId, "STAFF");
    const response = await app.inject({
      method: "POST", url: url("/orders"), headers: auth.headers,
      payload: { customer: { name: "Auth order fixture", phone: "5512" + Date.now() },
        type: "PICKUP", items: [{ productId: product.id, quantity: 1 }], deliveryFee: 0 },
    });
    expect(response.statusCode).toBe(201);
    const order = response.json<{ id: string; customerId: string }>();
    customerIds.push(order.customerId);
    const payment = url("/orders/" + order.id + "/payment");
    expect((await app.inject({ method: "PATCH", url: payment, headers: auth.headers })).statusCode).toBe(403);
    const [unpaid] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(unpaid.paymentStatus).toBe("PENDING");
    expect((await app.inject({
      method: "PATCH", url: url("/orders/" + order.id + "/status"), headers: auth.headers,
      payload: { status: "CONFIRMED" },
    })).statusCode).toBe(204);
    const [confirmed] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(confirmed.status).toBe("CONFIRMED");
    await auth.grant(restaurantId, "OWNER");
    expect((await app.inject({ method: "PATCH", url: payment, headers: auth.headers })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: url("/dashboard/sales-summary"), headers: auth.headers })).statusCode).toBe(200);
  });

  it("allows STAFF to create, start and complete Delivery", async () => {
    const [customer] = await db.insert(customers).values({
      name: "Delivery auth fixture", phone: "5513" + Date.now(),
    }).returning();
    customerIds.push(customer.id);
    const [order] = await db.insert(orders).values({
      restaurantId, customerId: customer.id, type: "DELIVERY", status: "READY",
      subtotal: 1000, total: 1000, deliveryFee: 0,
      customerName: customer.name, customerPhone: customer.phone,
      deliveryStreet: "Test street", deliveryNumber: "1",
      deliveryNeighborhood: "Test neighborhood", deliveryCity: "Test city",
      deliveryState: "SP", deliveryZipCode: "00000000",
    }).returning();
    await auth.grant(restaurantId, "STAFF");
    const path = url("/orders/" + order.id + "/delivery");
    expect((await app.inject({ method: "POST", url: path, headers: auth.headers })).statusCode).toBe(201);
    expect((await app.inject({ method: "PATCH", url: path + "/start", headers: auth.headers })).statusCode).toBe(204);
    expect((await app.inject({ method: "PATCH", url: path + "/complete", headers: auth.headers })).statusCode).toBe(204);
    const [delivered] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(delivered.status).toBe("DELIVERED");
  });

  it("preserves resource cross-tenant 404 even when user belongs to both Restaurants", async () => {
    await auth.grant(otherRestaurantId);
    const [table] = await db.insert(tables).values({ restaurantId, number: "1", capacity: 4, type: "table" }).returning();
    const response = await app.inject({
      method: "PATCH", url: "/restaurants/" + otherRestaurantId + "/tables/" + table.id,
      headers: auth.headers, payload: { number: 2 },
    });
    expect(response.statusCode).toBe(404);
    const [unchanged] = await db.select().from(tables).where(eq(tables.id, table.id));
    expect(unchanged.number).toBe("1");
  });

  it.each(["revoked", "expired", "idle", "inactive"] as const)("blocks business reads for %s session", async (state) => {
    if (state === "revoked") await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, auth.userId));
    if (state === "expired") await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1) }).where(eq(sessions.userId, auth.userId));
    if (state === "idle") await db.update(sessions).set({ lastActivityAt: new Date(Date.now() - 1_800_001) }).where(eq(sessions.userId, auth.userId));
    if (state === "inactive") await db.update(users).set({ active: false }).where(eq(users.id, auth.userId));
    const response = await app.inject({ method: "GET", url: url("/orders"), headers: auth.headers });
    expect(response.statusCode).toBe(401);
  });

  it("validates the tenant UUID only after authenticating", async () => {
    const path = "/restaurants/not-a-uuid/orders";
    expect((await app.inject({ method: "GET", url: path })).statusCode).toBe(401);
    const response = await app.inject({ method: "GET", url: path, headers: auth.headers });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("VALIDATION_ERROR");
  });

  it.each(["missing", "invalid", "origin"] as const)("rejects %s CSRF before business mutation or activity update", async (kind) => {
    const headers = { ...auth.headers };
    if (kind === "missing") delete headers["x-csrf-token"];
    if (kind === "invalid") headers["x-csrf-token"] = "x".repeat(43);
    if (kind === "origin") headers.origin = "https://evil.example";
    const before = await db.select().from(sessions).where(eq(sessions.userId, auth.userId));
    const response = await app.inject({ method: "PATCH", url: url(), headers, payload: { name: "Not saved" } });
    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe("INVALID_CSRF");
    expect(await db.select().from(sessions).where(eq(sessions.userId, auth.userId))).toEqual(before);
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
    expect(restaurant.name).toBe("Authorized");
  });

  it("fails closed for unclassified routes and exposes only server-resolved tenant context", async () => {
    isolatedApp = fastify();
    isolatedApp.setErrorHandler(errorHandler);
    await isolatedApp.register(cookie);
    registerAuthorization(isolatedApp);
    isolatedApp.get("/unclassified", async () => ({ leaked: true }));
    isolatedApp.get("/restaurants/:restaurantId/context", { config: { access: "tenant" } },
      async (request) => request.authContext);
    expect((await isolatedApp.inject({ method: "GET", url: "/unclassified" })).statusCode).toBe(401);
    expect((await isolatedApp.inject({ method: "GET", url: "/unclassified", headers: auth.headers })).statusCode).toBe(403);
    const context = await isolatedApp.inject({
      method: "GET", url: url("/context"), headers: { ...auth.headers, "x-role": "STAFF" },
    });
    expect(context.statusCode).toBe(200);
    expect(context.json()).toEqual({ userId: auth.userId, restaurantId, role: "OWNER" });
  });
});
