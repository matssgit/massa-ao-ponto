import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { customers, restaurants, tables, reservations, reservationHistory } from "../../../src/db/schema/index.js";
import { createPublicReservationToken, hashPublicReservationToken } from "../../../src/modules/reservations/public-reservation-tokens.js";
import { DrizzleReservationHistoryRepository } from "../../../src/modules/reservations/repositories/drizzle-reservation-history-repository.js";
import { useTestAuth, nextAuthClientAddress } from "../../helpers/auth.js";

import { DrizzleRestaurantsRepository } from "../../../src/modules/restaurants/repositories/drizzle-restaurants-repository.js";

const auth = useTestAuth(app);
const headers = { origin: "http://localhost:5173", "x-auth-request": "1" };
let restaurant: typeof restaurants.$inferSelect;
let table: typeof tables.$inferSelect;
let remoteAddress: string;
const startsAt = new Date(Date.now() + 86400000).toISOString();
const endsAt = new Date(Date.now() + 90000000).toISOString();
const payload = () => ({ tableId: table.id, customer: { name: "Public visitor", phone: "11987654321" }, partySize: 2, startsAt, endsAt });
const create = (body = payload()) => app.inject({ method: "POST", url: `/public/restaurants/${restaurant.slug}/reservations`, headers, remoteAddress, payload: body });
const availability = () => `/public/restaurants/${restaurant.slug}/reservations/availability?startsAt=${startsAt}&endsAt=${endsAt}&partySize=2`;
const patch = (body: object) => app.inject({ method: "PATCH", url: `/restaurants/${restaurant.id}`, headers: auth.headers, payload: body });

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => {
  remoteAddress = nextAuthClientAddress();
  restaurant = await auth.createRestaurant({ name: "Public pizza", address: "Main street", slug: randomUUID(), publicEnabled: true });
  [table] = await db.insert(tables).values({ restaurantId: restaurant.id, number: "1", capacity: 4, type: "table" }).returning();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await db.delete(restaurants).where(eq(restaurants.id, restaurant.id));
});

describe("Public reservation foundation", () => {
  it("keeps publication opt-in and lets only OWNER canonicalize and publish", async () => {
    const hidden = await auth.createRestaurant();
    try {
      expect(hidden).toMatchObject({ slug: null, publicEnabled: false });
      expect((await patch({ slug: "  PIZZÁ Casa  ", publicEnabled: true })).json()).toMatchObject({ slug: "pizza-casa", publicEnabled: true });
      expect((await patch({ slug: null })).statusCode).toBe(409);
      expect((await patch({ slug: "---" })).statusCode).toBe(409);
      await auth.grant(restaurant.id, "STAFF");
      expect((await patch({ publicEnabled: false })).statusCode).toBe(403);
      expect((await app.inject({ method: "PATCH", url: `/restaurants/${restaurant.id}`, headers, payload: { publicEnabled: false } })).statusCode).toBe(401);
    } finally { await db.delete(restaurants).where(eq(restaurants.id, hidden.id)); }
  });

  it("rejects duplicate slugs including concurrent publication", async () => {
    const other = await auth.createRestaurant();
    try {
      const slug = "shared-" + randomUUID();
      const responses = await Promise.all([
        patch({ slug }),
        app.inject({ method: "PATCH", url: `/restaurants/${other.id}`, headers: auth.headers, payload: { slug, publicEnabled: true } }),
      ]);
      expect(responses.map(r => r.statusCode).sort()).toEqual([200, 409]);
      expect(responses.find(r => r.statusCode === 409)?.json().code).toBe("RESTAURANT_SLUG_CONFLICT");
    } finally { await db.delete(restaurants).where(eq(restaurants.id, other.id)); }
  });

  it("maps database uniqueness violations to a domain conflict", async () => {
    const other = await auth.createRestaurant();
    try {
      await expect(new DrizzleRestaurantsRepository().update(other.id, { slug: restaurant.slug })).rejects.toMatchObject({ name: "RestaurantSlugConflictError" });
      await expect(new DrizzleRestaurantsRepository().update(other.id, { publicEnabled: true })).rejects.toMatchObject({ name: "InvalidRestaurantPublicConfigError" });
    } finally { await db.delete(restaurants).where(eq(restaurants.id, other.id)); }
  });

  it("does not distinguish foreign tables from missing tables", async () => {
    const other = await auth.createRestaurant();
    try {
      const [foreign] = await db.insert(tables).values({ restaurantId: other.id, number: "9", capacity: 4, type: "table", active: false }).returning();
      const response = await create({ ...payload(), tableId: foreign.id });
      const missing = await create({ ...payload(), tableId: randomUUID() });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual(missing.json());
    } finally { await db.delete(restaurants).where(eq(restaurants.id, other.id)); }
  });

  it("returns only public Restaurant fields and hides unpublished and unknown restaurants", async () => {
    const response = await app.inject({ url: `/public/restaurants/${restaurant.slug}` });
    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json()).sort()).toEqual(["address", "name", "phone", "slug", "timezone"]);
    expect(response.headers["cache-control"]).toBe("no-store");
    await patch({ publicEnabled: false });
    const hidden = await app.inject({ url: `/public/restaurants/${restaurant.slug}` });
    const missing = await app.inject({ url: "/public/restaurants/not-existing" });
    expect(hidden.statusCode).toBe(404);
    expect(hidden.json()).toEqual(missing.json());
    expect((await app.inject({ url: availability(), remoteAddress })).statusCode).toBe(404);
    expect((await create()).statusCode).toBe(404);
  });

  it("filters availability by capacity, activity and overlap with a minimal projection", async () => {
    await db.insert(tables).values([
      { restaurantId: restaurant.id, number: "2", capacity: 1, type: "table" },
      { restaurantId: restaurant.id, number: "3", capacity: 4, type: "table", active: false },
    ]);
    expect((await app.inject({ url: availability(), remoteAddress })).json()).toEqual([{ id: table.id, number: "1", capacity: 4, type: "table" }]);
    expect((await create()).statusCode).toBe(201);
    expect((await app.inject({ url: availability(), remoteAddress })).json()).toEqual([]);
    const adjacent = availability().replace(`startsAt=${startsAt}`, `startsAt=${endsAt}`).replace(`endsAt=${endsAt}`, `endsAt=${new Date(Date.parse(endsAt) + 3600000).toISOString()}`);
    expect((await app.inject({ url: adjacent, remoteAddress })).json()).toHaveLength(1);
  });

  it("persists only a high entropy hash, omits customer/IDs, and supports reusable lookup and cancel", async () => {
    const response = await create();
    expect(response.statusCode).toBe(201);
    const body = response.json<{ accessToken: string }>();
    expect(body.accessToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const [stored] = await db.select().from(reservations).where(eq(reservations.restaurantId, restaurant.id));
    expect(stored.publicAccessTokenHash).toBe(hashPublicReservationToken(body.accessToken));
    expect(JSON.stringify(stored)).not.toContain(body.accessToken);
    expect(Object.keys(response.json()).sort()).toEqual(["accessToken", "reservation", "restaurant", "table"]);
    expect(response.body).not.toContain("customer");
    expect(response.body).not.toContain(stored.id);
    for (let i = 0; i < 2; i++) {
      const lookup = await app.inject({ url: `/public/reservations/${body.accessToken}`, remoteAddress });
      expect(lookup.statusCode).toBe(200);
      expect(lookup.body).not.toMatch(/accessToken|Hash|customerId|restaurantId|tableId/);
    }
    const administrative = await app.inject({ url: `/restaurants/${restaurant.id}/reservations/${stored.id}`, headers: auth.headers });
    expect(administrative.statusCode).toBe(200);
    expect(administrative.body).not.toContain("Hash");
    await patch({ publicEnabled: false });
    const cancelled = await app.inject({ method: "POST", url: `/public/reservations/${body.accessToken}/cancel`, headers, remoteAddress });
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json().reservation.status).toBe("CANCELLED");
    expect((await app.inject({ url: `/public/reservations/${body.accessToken}`, remoteAddress })).json().reservation.status).toBe("CANCELLED");
    const [after] = await db.select().from(reservations).where(eq(reservations.id, stored.id));
    expect(after.publicAccessTokenHash).toBe(stored.publicAccessTokenHash);
  });

  it("never treats a UUID or unknown token as ownership and protects admin endpoints", async () => {
    const response = await create();
    expect(response.statusCode).toBe(201);
    const [stored] = await db.select().from(reservations).where(eq(reservations.restaurantId, restaurant.id));
    expect((await app.inject({ url: `/public/reservations/${stored.id}`, remoteAddress })).statusCode).toBe(400);
    const missingToken = createPublicReservationToken();
    expect((await app.inject({ url: `/public/reservations/${missingToken}`, remoteAddress })).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: `/public/reservations/${missingToken}/cancel`, headers, remoteAddress })).statusCode).toBe(404);
    expect((await app.inject({ url: `/restaurants/${restaurant.id}/reservations/${stored.id}` })).statusCode).toBe(401);
    expect((await app.inject({ url: `/public/customers/${stored.customerId}` })).statusCode).toBe(404);
  });

  it("does not enumerate or overwrite a global Customer", async () => {
    const phone = "551199999" + String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const [customer] = await db.insert(customers).values({ name: "Private existing name", email: "private@example.test", phone }).returning();
    try {
      const response = await create({ ...payload(), customer: { name: "Supplied name", phone } });
      expect(response.statusCode).toBe(201);
      expect(response.body).not.toMatch(/Private existing|private@example|customer|existing/);
      const [unchanged] = await db.select().from(customers).where(eq(customers.id, customer.id));
      expect(unchanged).toEqual(customer);
    } finally {
      await db.delete(reservations).where(eq(reservations.restaurantId, restaurant.id));
      await db.delete(customers).where(eq(customers.id, customer.id));
    }
  });

  it("rolls back customer/reservation/hash/history on history failure", async () => {
    const phone = "5511888877776";
    await db.delete(customers).where(eq(customers.phone, phone));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(DrizzleReservationHistoryRepository.prototype, "create").mockRejectedValueOnce(new Error("sensitive query payload"));
    expect((await create({ ...payload(), customer: { name: "Rollback", phone } })).statusCode).toBe(500);
    expect(await db.select().from(reservations).where(eq(reservations.restaurantId, restaurant.id))).toEqual([]);
    expect(await db.select().from(customers).where(eq(customers.phone, phone))).toEqual([]);
    expect(log).toHaveBeenCalledWith("Public request failed.");
    expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive");
  });

  it("serializes competing creates and cancellations with a single history transition", async () => {
    const results = await Promise.all([create(), create()]);
    expect(results.map(r => r.statusCode).sort()).toEqual([201, 409]);
    const accessToken = results.find(r => r.statusCode === 201)!.json<{ accessToken: string }>().accessToken;
    const cancellations = await Promise.all([1, 2].map(() => app.inject({ method: "POST", url: `/public/reservations/${accessToken}/cancel`, headers, remoteAddress })));
    expect(cancellations.map(r => r.statusCode).sort()).toEqual([200, 409]);
    const [stored] = await db.select().from(reservations).where(eq(reservations.restaurantId, restaurant.id));
    expect(await db.select().from(reservationHistory).where(eq(reservationHistory.reservationId, stored.id))).toHaveLength(2);
  });

  it("enforces the cancellation window and does not invalidate the token", async () => {
    const response = await create({ ...payload(), startsAt: new Date(Date.now() + 3600000).toISOString(), endsAt: new Date(Date.now() + 7200000).toISOString() });
    const token = response.json<{ accessToken: string }>().accessToken;
    expect(response.statusCode).toBe(201);
    expect((await app.inject({ method: "POST", url: `/public/reservations/${token}/cancel`, headers, remoteAddress })).statusCode).toBe(409);
    expect((await app.inject({ url: `/public/reservations/${token}`, remoteAddress })).json().reservation.status).toBe("SCHEDULED");
  });

  it("requires trusted origin for public writes and sanitizes parser failures", async () => {
    expect((await app.inject({ method: "POST", url: `/public/restaurants/${restaurant.slug}/reservations`, payload: payload() })).statusCode).toBe(403);
    const malformed = await app.inject({ method: "POST", url: `/public/restaurants/${restaurant.slug}/reservations`, headers: { ...headers, "content-type": "application/json" }, payload: '{"private":' });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json().code).toBe("INVALID_PUBLIC_REQUEST");
  });
});
