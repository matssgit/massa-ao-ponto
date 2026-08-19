import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  customers,
  reservationHistory,
  reservations,
  restaurants,
  tables,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

describe("Reservations (E2E)", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.delete(reservationHistory);
    await db.delete(reservations);
    await db.delete(customers);
    await db.delete(tables);
    await db.delete(restaurants);
  });

  async function setupBase() {
    const restaurantRes = await app.inject({
      method: "POST",
      url: "/restaurants",
      payload: {
        name: "Restaurante Teste",
        address: "Rua Teste",
        phone: "11999999999",
        timezone: "UTC",
      },
    });
    const restaurant = restaurantRes.json();

    const tableRes = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: {
        number: 1,
        capacity: 4,
        type: "table",
      },
    });
    const table = tableRes.json();

    return { restaurant, table };
  }

  it("should be able to create a new reservation (201) and generate history", async () => {
    const { restaurant, table } = await setupBase();

    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "João", phone: "11988888888" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toEqual(expect.any(String));
    expect(body.status).toBe("SCHEDULED");

    const history = await db
      .select()
      .from(reservationHistory)
      .where(eq(reservationHistory.reservationId, body.id));
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      action: "CREATED",
      previousStatus: null,
      newStatus: "SCHEDULED",
    });
    expect(history[0].createdAt).toBeInstanceOf(Date);
  });

  it("should reuse an existing customer by phone", async () => {
    const { restaurant, table } = await setupBase();

    const res1 = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Maria", phone: "11977777777" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });

    const res2 = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Maria Silva", phone: "11977777777" },
        people: 2,
        startsAt: "2026-08-21T19:00:00.000Z",
        endsAt: "2026-08-21T21:00:00.000Z",
      },
    });

    expect(res1.statusCode).toBe(201);
    expect(res2.statusCode).toBe(201);
    expect(res1.json().customerId).toEqual(res2.json().customerId);

    const allCustomers = await db.select().from(customers);
    expect(allCustomers).toHaveLength(1);
  });

  it("should return 400 for invalid restaurantId", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/restaurants/invalid-uuid/reservations`,
      payload: {
        tableId: randomUUID(),
        customer: { name: "João", phone: "11988888888" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for invalid tableId", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${randomUUID()}/reservations`,
      payload: {
        tableId: "invalid-uuid",
        customer: { name: "João", phone: "11988888888" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for invalid payload (missing customer name)", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${randomUUID()}/reservations`,
      payload: {
        tableId: randomUUID(),
        customer: { phone: "11988888888" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("should return 404 for non-existent table", async () => {
    const { restaurant } = await setupBase();
    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: randomUUID(),
        customer: { name: "João", phone: "11988888888" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });
    expect(response.statusCode).toBe(404);
  });

  it("should return 400 if table belongs to another restaurant", async () => {
    const { table } = await setupBase();
    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${randomUUID()}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "João", phone: "11988888888" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("should return 409 if table is inactive", async () => {
    const { restaurant, table } = await setupBase();
    await db
      .update(tables)
      .set({ active: false })
      .where(eq(tables.id, table.id));

    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "João", phone: "11988888888" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });
    expect(response.statusCode).toBe(409);
  });

  it("should return 409 if people exceed table capacity", async () => {
    const { restaurant, table } = await setupBase();
    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "João", phone: "11988888888" },
        people: 10,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });
    expect(response.statusCode).toBe(409);
  });

  it("should return 400 for invalid time range (startsAt >= endsAt)", async () => {
    const { restaurant, table } = await setupBase();
    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "João", phone: "11988888888" },
        people: 2,
        startsAt: "2026-08-20T21:00:00.000Z",
        endsAt: "2026-08-20T19:00:00.000Z",
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it("should return 409 for conflict with SCHEDULED reservation", async () => {
    const { restaurant, table } = await setupBase();
    await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "João", phone: "11988888888" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Maria", phone: "11977777777" },
        people: 2,
        startsAt: "2026-08-20T20:00:00.000Z",
        endsAt: "2026-08-20T22:00:00.000Z",
      },
    });
    expect(response.statusCode).toBe(409);
  });

  it("should return 409 for conflict with CONFIRMED reservation", async () => {
    const { restaurant, table } = await setupBase();
    const [customer] = await db
      .insert(customers)
      .values({ name: "João", phone: "11" })
      .returning();

    await db.insert(reservations).values({
      restaurantId: restaurant.id,
      tableId: table.id,
      customerId: customer.id,
      status: "CONFIRMED",
      people: 2,
      startsAt: new Date("2026-08-20T19:00:00.000Z"),
      endsAt: new Date("2026-08-20T21:00:00.000Z"),
    });

    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Maria", phone: "11977777777" },
        people: 2,
        startsAt: "2026-08-20T20:00:00.000Z",
        endsAt: "2026-08-20T22:00:00.000Z",
      },
    });
    expect(response.statusCode).toBe(409);
  });

  it("should allow reservation if previous conflicting one is CANCELLED or FINISHED", async () => {
    const { restaurant, table } = await setupBase();
    const [customer] = await db
      .insert(customers)
      .values({ name: "João", phone: "11" })
      .returning();

    await db.insert(reservations).values({
      restaurantId: restaurant.id,
      tableId: table.id,
      customerId: customer.id,
      status: "CANCELLED",
      people: 2,
      startsAt: new Date("2026-08-20T19:00:00.000Z"),
      endsAt: new Date("2026-08-20T21:00:00.000Z"),
    });

    await db.insert(reservations).values({
      restaurantId: restaurant.id,
      tableId: table.id,
      customerId: customer.id,
      status: "FINISHED",
      people: 2,
      startsAt: new Date("2026-08-20T19:00:00.000Z"),
      endsAt: new Date("2026-08-20T21:00:00.000Z"),
    });

    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Maria", phone: "11977777777" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });
    expect(response.statusCode).toBe(201);
  });

  it("should allow adjacent intervals [19:00, 21:00) and [21:00, 23:00)", async () => {
    const { restaurant, table } = await setupBase();

    await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "João", phone: "11988888888" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Maria", phone: "11977777777" },
        people: 2,
        startsAt: "2026-08-20T21:00:00.000Z",
        endsAt: "2026-08-20T23:00:00.000Z",
      },
    });
    expect(response.statusCode).toBe(201);
  });

  it("should be able to update reservation status to CONFIRMED (200)", async () => {
    const { restaurant, table } = await setupBase();

    const createRes = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "João", phone: "11988888888" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });

    const reservation = createRes.json();

    const response = await app.inject({
      method: "PATCH",
      url: `/reservations/${reservation.id}/status`,
      payload: {
        status: "CONFIRMED",
        observation: "Confirmado por telefone",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("CONFIRMED");

    const history = await db
      .select()
      .from(reservationHistory)
      .where(eq(reservationHistory.reservationId, reservation.id));
    expect(history).toHaveLength(2);
    expect(history[1]).toMatchObject({
      action: "STATUS_CHANGED",
      previousStatus: "SCHEDULED",
      newStatus: "CONFIRMED",
      observation: "Confirmado por telefone",
    });
  });

  it("should return 409 when applying an invalid status transition", async () => {
    const { restaurant, table } = await setupBase();
    const createRes = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "João", phone: "11988888888" }, // <- Telefone corrigido aqui!
        people: 2,
        startsAt: "2026-08-20T19:00:00Z",
        endsAt: "2026-08-20T21:00:00Z",
      },
    });

    const reservation = createRes.json();

    const response = await app.inject({
      method: "PATCH",
      url: `/reservations/${reservation.id}/status`,
      payload: { status: "FINISHED" },
    });

    expect(response.statusCode).toBe(409);
  });

  it("should return 404 for non-existent reservation status update", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/reservations/${randomUUID()}/status`,
      payload: { status: "CONFIRMED" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("should return 400 for invalid UUID in params", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/reservations/invalid-id/status`,
      payload: { status: "CONFIRMED" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for invalid body payload", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/reservations/${randomUUID()}/status`,
      payload: { status: "INVALID_STATUS" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("should be able to list reservations with filters and sorting (200)", async () => {
    const { restaurant, table } = await setupBase();

    await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "João", phone: "11988888888" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });

    const res2 = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Maria", phone: "11977777777" },
        people: 2,
        startsAt: "2026-08-20T17:00:00.000Z",
        endsAt: "2026-08-20T19:00:00.000Z",
      },
    });

    const secondReservationId = res2.json().id;
    await app.inject({
      method: "PATCH",
      url: `/reservations/${secondReservationId}/status`,
      payload: { status: "CONFIRMED" },
    });

    const listAllResponse = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/reservations`,
    });

    expect(listAllResponse.statusCode).toBe(200);
    const listAll = listAllResponse.json();
    expect(listAll).toHaveLength(2);
    expect(listAll[0].startsAt).toContain("17:00:00");

    const listFilteredResponse = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/reservations?status=CONFIRMED`,
    });

    expect(listFilteredResponse.statusCode).toBe(200);
    const listFiltered = listFilteredResponse.json();
    expect(listFiltered).toHaveLength(1);
    expect(listFiltered[0].status).toBe("CONFIRMED");
  });

  it("should return 400 for inverted date range filter (startsAt > endsAt)", async () => {
    const { restaurant } = await setupBase();
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/reservations?startsAt=2026-08-20T21:00:00.000Z&endsAt=2026-08-20T19:00:00.000Z`,
    });
    expect(response.statusCode).toBe(400);
  });
});
