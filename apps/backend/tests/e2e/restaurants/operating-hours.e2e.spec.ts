import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { restaurantOperatingHours, restaurantSpecialHours, restaurants } from "../../../src/db/schema/index.js";
import { useTestAuth } from "../../helpers/auth.js";

const auth = useTestAuth(app);
let restaurant: typeof restaurants.$inferSelect;
const days = Array.from({ length: 7 }, (_, dayOfWeek) => dayOfWeek === 1
  ? { dayOfWeek, active: true as const, opensAt: "09:00", closesAt: "18:00" }
  : { dayOfWeek, active: false as const, opensAt: null, closesAt: null });

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });
beforeEach(async () => {
  restaurant = await auth.createRestaurant({ name: "Hours", address: "Rua A", timezone: "America/Sao_Paulo" });
});

describe("Restaurant operating hours (E2E)", () => {
  it("returns an unrestricted default and lets OWNER replace the complete week", async () => {
    const initial = await app.inject({ url: `/restaurants/${restaurant.id}/operating-hours`, headers: auth.headers });
    expect(initial.statusCode).toBe(200);
    expect(initial.json()).toEqual({ configured: false, days: days.map(day => ({ ...day, active: false, opensAt: null, closesAt: null })) });

    const updated = await app.inject({ method: "PUT", url: `/restaurants/${restaurant.id}/operating-hours`, headers: auth.headers, payload: { days } });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toEqual({ configured: true, days });
    expect(await db.select().from(restaurantOperatingHours).where(eq(restaurantOperatingHours.restaurantId, restaurant.id))).toHaveLength(7);
  });

  it("is OWNER-only and rejects incomplete or overnight weeks", async () => {
    await auth.grant(restaurant.id, "STAFF");
    expect((await app.inject({ url: `/restaurants/${restaurant.id}/operating-hours`, headers: auth.headers })).statusCode).toBe(403);
    expect((await app.inject({ method: "PUT", url: `/restaurants/${restaurant.id}/operating-hours`, headers: auth.headers, payload: { days } })).statusCode).toBe(403);
    await auth.grant(restaurant.id, "OWNER");
    expect((await app.inject({ method: "PUT", url: `/restaurants/${restaurant.id}/operating-hours`, headers: auth.headers, payload: { days: days.slice(0, 6) } })).statusCode).toBe(400);
    expect((await app.inject({ method: "PUT", url: `/restaurants/${restaurant.id}/operating-hours`, headers: auth.headers, payload: { days: days.map(day => day.dayOfWeek === 1 ? { ...day, opensAt: "20:00", closesAt: "08:00" } : day) } })).statusCode).toBe(400);
  });

  it("lets OWNER manage tenant-scoped special dates and blocks STAFF", async () => {
    const created = await app.inject({ method: "POST", url: `/restaurants/${restaurant.id}/special-hours`, headers: auth.headers, payload: { date: "2026-12-25", closed: true, label: "Natal" } });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ restaurantId: restaurant.id, date: "2026-12-25", closed: true, opensAt: null, closesAt: null, label: "Natal" });
    const id = created.json<{ id: string }>().id;
    expect((await app.inject({ method: "POST", url: `/restaurants/${restaurant.id}/special-hours`, headers: auth.headers, payload: { date: "2026-12-25", closed: true } })).statusCode).toBe(409);
    const updated = await app.inject({ method: "PATCH", url: `/restaurants/${restaurant.id}/special-hours/${id}`, headers: auth.headers, payload: { date: "2026-12-25", closed: false, opensAt: "12:00", closesAt: "16:00", label: "Natal aberto" } });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ closed: false, opensAt: "12:00:00", closesAt: "16:00:00" });
    expect((await app.inject({ url: `/restaurants/${restaurant.id}/special-hours`, headers: auth.headers })).json()).toHaveLength(1);
    const [foreign] = await db.insert(restaurants).values({ name: "Foreign", address: "Rua B", timezone: "UTC" }).returning();
    try {
      expect((await app.inject({ url: `/restaurants/${foreign.id}/special-hours`, headers: auth.headers })).statusCode).toBe(404);
    } finally { await db.delete(restaurants).where(eq(restaurants.id, foreign.id)); }
    await auth.grant(restaurant.id, "STAFF");
    expect((await app.inject({ url: `/restaurants/${restaurant.id}/special-hours`, headers: auth.headers })).statusCode).toBe(403);
    await auth.grant(restaurant.id, "OWNER");
    expect((await app.inject({ method: "DELETE", url: `/restaurants/${restaurant.id}/special-hours/${id}`, headers: auth.headers })).statusCode).toBe(204);
    expect(await db.select().from(restaurantSpecialHours).where(eq(restaurantSpecialHours.restaurantId, restaurant.id))).toEqual([]);
  });
});
