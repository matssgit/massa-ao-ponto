import { useTestAuth } from "../../helpers/auth.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  customers,
  deliveries,
  deliveryHistory,
  orderHistory,
  orderItems,
  orders,
  reservationHistory,
  reservations,
  restaurants,
  tables,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const auth = useTestAuth(app);

describe("Reservations (E2E)", () => {
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
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(reservationHistory);
    await db.delete(reservations);
    await db.delete(customers);
    await db.delete(tables);
    await db.delete(restaurants);
  });

  async function setupBase() {
    const restaurant = await auth.createRestaurant({
        name: "Restaurante Teste",
        address: "Rua Teste",
        phone: "11999999999",
        timezone: "UTC",
      });

    const tableRes = await app.inject({
      headers: auth.headers,
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
      headers: auth.headers,
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
      headers: auth.headers,
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
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Maria Silva", phone: "(11) 97777-7777" },
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
    expect(allCustomers[0]).toMatchObject({
      name: "Maria",
      phone: "11977777777",
    });
  });

  it("should converge concurrent reservations to one canonical customer", async () => {
    const { restaurant, table } = await setupBase();
    const secondTable = (
      await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/tables`,
        payload: { number: 2, capacity: 4, type: "table" },
      })
    ).json();

    const responses = await Promise.all([
      app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/reservations`,
        payload: {
          tableId: table.id,
          customer: { name: "Concorrente", phone: "(11) 96666-5555" },
          people: 2,
          startsAt: "2026-08-20T19:00:00.000Z",
          endsAt: "2026-08-20T21:00:00.000Z",
        },
      }),
      app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/reservations`,
        payload: {
          tableId: secondTable.id,
          customer: { name: "Outro nome", phone: "11 96666.5555" },
          people: 2,
          startsAt: "2026-08-20T19:00:00.000Z",
          endsAt: "2026-08-20T21:00:00.000Z",
        },
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
      .where(eq(customers.phone, "11966665555"));
    expect(matchingCustomers).toHaveLength(1);
  });

  it("should reject a phone shorter than ten digits after normalization", async () => {
    const { restaurant, table } = await setupBase();
    const response = await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Inválido", phone: "(11) 9999-999" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should rollback a new customer when a later reservation conflict occurs", async () => {
    const { restaurant, table } = await setupBase();
    const existingReservation = await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Existente", phone: "11911112222" },
        people: 2,
        startsAt: "2026-08-20T19:00:00.000Z",
        endsAt: "2026-08-20T21:00:00.000Z",
      },
    });
    const rejected = await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Rollback", phone: "(11) 92222-3333" },
        people: 2,
        startsAt: "2026-08-20T20:00:00.000Z",
        endsAt: "2026-08-20T22:00:00.000Z",
      },
    });

    expect(existingReservation.statusCode).toBe(201);
    expect(rejected.statusCode).toBe(409);
    const rolledBackCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, "11922223333"));
    expect(rolledBackCustomers).toHaveLength(0);
    expect(await db.select().from(reservations)).toHaveLength(1);
  });

  it("should return 400 for invalid restaurantId", async () => {
    const response = await app.inject({
      headers: auth.headers,
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
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${(await auth.createRestaurant()).id}/reservations`,
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
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${(await auth.createRestaurant()).id}/reservations`,
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
      headers: auth.headers,
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
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${(await auth.createRestaurant()).id}/reservations`,
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
      headers: auth.headers,
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
      headers: auth.headers,
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
      headers: auth.headers,
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
      headers: auth.headers,
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
      headers: auth.headers,
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
      headers: auth.headers,
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
      headers: auth.headers,
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
      headers: auth.headers,
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
      headers: auth.headers,
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
    const otherRestaurant = await auth.createRestaurant({
        name: "Outro Restaurante",
        address: "Rua",
        phone: "22",
        timezone: "UTC",
      });

    const createRes = await app.inject({
      headers: auth.headers,
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
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/status`,
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

    const crossTenantResponse = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${otherRestaurant.id}/reservations/${reservation.id}/status`,
      payload: { status: "FINISHED" },
    });
    expect(crossTenantResponse.statusCode).toBe(404);

    const [preservedReservation] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservation.id));
    const preservedHistory = await db
      .select()
      .from(reservationHistory)
      .where(eq(reservationHistory.reservationId, reservation.id));
    expect(preservedReservation.status).toBe("CONFIRMED");
    expect(preservedHistory).toHaveLength(2);

    const oldRouteResponse = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/reservations/${reservation.id}/status`,
      payload: { status: "FINISHED" },
    });
    expect(oldRouteResponse.statusCode).toBe(404);
  });

  it("should serialize concurrent status updates with a row-level lock", async () => {
    const { restaurant, table } = await setupBase();
    const createResponse = await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Concorrente", phone: "11955555555" },
        people: 2,
        startsAt: "2026-08-25T19:00:00Z",
        endsAt: "2026-08-25T21:00:00Z",
      },
    });
    const reservation = createResponse.json();

    const responses = await Promise.all([
      app.inject({
        headers: auth.headers,
        method: "PATCH",
        url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/status`,
        payload: { status: "CONFIRMED" },
      }),
      app.inject({
        headers: auth.headers,
        method: "PATCH",
        url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/status`,
        payload: { status: "CONFIRMED" },
      }),
    ]);

    expect(responses.map((response) => response.statusCode).sort()).toEqual([
      200, 409,
    ]);

    const history = await db
      .select()
      .from(reservationHistory)
      .where(eq(reservationHistory.reservationId, reservation.id));
    expect(history).toHaveLength(2);
    expect(history[1]).toMatchObject({
      previousStatus: "SCHEDULED",
      newStatus: "CONFIRMED",
    });
  });

  it("should return 409 when applying an invalid status transition", async () => {
    const { restaurant, table } = await setupBase();
    const createRes = await app.inject({
      headers: auth.headers,
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
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/status`,
      payload: { status: "FINISHED" },
    });

    expect(response.statusCode).toBe(409);
  });

  it("should return 404 for non-existent reservation status update", async () => {
    const response = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${randomUUID()}/reservations/${randomUUID()}/status`,
      payload: { status: "CONFIRMED" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("should return 400 for invalid UUID in params", async () => {
    const response = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${(await auth.createRestaurant()).id}/reservations/invalid-id/status`,
      payload: { status: "CONFIRMED" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for invalid body payload", async () => {
    const response = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${(await auth.createRestaurant()).id}/reservations/${randomUUID()}/status`,
      payload: { status: "INVALID_STATUS" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("should be able to list reservations with filters and sorting (200)", async () => {
    const { restaurant, table } = await setupBase();

    await app.inject({
      headers: auth.headers,
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
      headers: auth.headers,
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
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${restaurant.id}/reservations/${secondReservationId}/status`,
      payload: { status: "CONFIRMED" },
    });

    await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Carlos", phone: "11966666666" },
        people: 2,
        startsAt: "2026-08-20T21:00:00.000Z",
        endsAt: "2026-08-20T23:00:00.000Z",
      },
    });

    const otherTenant = await setupBase();
    await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${otherTenant.restaurant.id}/reservations`,
      payload: {
        tableId: otherTenant.table.id,
        customer: { name: "Outro tenant", phone: "11955555555" },
        people: 2,
        startsAt: "2026-08-20T16:00:00.000Z",
        endsAt: "2026-08-20T17:00:00.000Z",
      },
    });

    const listAllResponse = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${restaurant.id}/reservations?page=1&limit=2`,
    });

    expect(listAllResponse.statusCode).toBe(200);
    const listAll = listAllResponse.json();
    expect(
      listAll.data.map(
        ({ reservation }: { reservation: { startsAt: string } }) =>
          reservation.startsAt,
      ),
    ).toEqual([
      "2026-08-20T17:00:00.000Z",
      "2026-08-20T19:00:00.000Z",
    ]);
    expect(listAll.data[0]).toMatchObject({
      reservation: { id: secondReservationId },
      customer: { name: "Maria", phone: "11977777777" },
      table: { id: table.id, restaurantId: restaurant.id },
    });
    expect(listAll.meta).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
      hasNext: true,
      hasPrevious: false,
    });

    const finalPageResponse = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${restaurant.id}/reservations?page=2&limit=2`,
    });

    expect(finalPageResponse.statusCode).toBe(200);
    expect(finalPageResponse.json().meta).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
      hasNext: false,
      hasPrevious: true,
    });
    expect(finalPageResponse.json().data).toHaveLength(1);

    const listFilteredResponse = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${restaurant.id}/reservations?status=CONFIRMED`,
    });

    expect(listFilteredResponse.statusCode).toBe(200);
    const listFiltered = listFilteredResponse.json();
    expect(listFiltered.data).toHaveLength(1);
    expect(listFiltered.data[0].reservation.status).toBe("CONFIRMED");
    expect(listFiltered.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("should list reservations using schedule overlap semantics", async () => {
    const { restaurant, table } = await setupBase();
    const secondTableResponse = await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: { number: 2, capacity: 4, type: "table" },
    });
    const thirdTableResponse = await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: { number: 3, capacity: 4, type: "table" },
    });

    const scenarios = [
      {
        tableId: table.id,
        customer: { name: "Início parcial", phone: "11911111111" },
        people: 2,
        startsAt: "2026-08-20T18:00:00.000Z",
        endsAt: "2026-08-20T20:00:00.000Z",
      },
      {
        tableId: secondTableResponse.json().id,
        customer: { name: "Fim parcial", phone: "11922222222" },
        people: 2,
        startsAt: "2026-08-20T20:00:00.000Z",
        endsAt: "2026-08-20T22:00:00.000Z",
      },
      {
        tableId: thirdTableResponse.json().id,
        customer: { name: "Fora", phone: "11933333333" },
        people: 2,
        startsAt: "2026-08-20T21:00:00.000Z",
        endsAt: "2026-08-20T23:00:00.000Z",
      },
    ];

    for (const payload of scenarios) {
      const response = await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/reservations`,
        payload,
      });
      expect(response.statusCode).toBe(201);
    }

    const response = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${restaurant.id}/reservations?startsAt=2026-08-20T19:00:00.000Z&endsAt=2026-08-20T21:00:00.000Z`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(
      body.data.map(
        ({ reservation }: { reservation: { startsAt: string } }) =>
          reservation.startsAt,
      ),
    ).toEqual([
      "2026-08-20T18:00:00.000Z",
      "2026-08-20T20:00:00.000Z",
    ]);
    expect(body.meta.total).toBe(2);
  });

  it("should return 400 for inverted date range filter (startsAt > endsAt)", async () => {
    const { restaurant } = await setupBase();
    const response = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${restaurant.id}/reservations?startsAt=2026-08-20T21:00:00.000Z&endsAt=2026-08-20T19:00:00.000Z`,
    });
    expect(response.statusCode).toBe(400);
  });
});
