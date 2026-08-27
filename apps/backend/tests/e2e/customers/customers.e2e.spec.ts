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
import { randomUUID } from "node:crypto";

describe("Customers (E2E)", () => {
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
    await db.delete(customers);
    await db.delete(tables);
    await db.delete(restaurants);
  });

  async function createRestaurant(name: string, tableNumber: number) {
    const restaurantResponse = await app.inject({
      method: "POST",
      url: "/restaurants",
      payload: { name, address: "Rua", phone: "11", timezone: "UTC" },
    });
    const restaurant = restaurantResponse.json();
    const tableResponse = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: { number: tableNumber, capacity: 4, type: "table" },
    });

    return { restaurant, table: tableResponse.json() };
  }

  async function createReservation(
    restaurantId: string,
    tableId: string,
    phone: string,
    startsAt: string,
  ) {
    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurantId}/reservations`,
      payload: {
        tableId,
        customer: { name: "Cliente Teste", phone },
        people: 2,
        startsAt,
        endsAt: new Date(
          new Date(startsAt).getTime() + 7_200_000,
        ).toISOString(),
      },
    });

    expect(response.statusCode).toBe(201);
    return response.json();
  }

  async function createOrder(customerId: string, restaurantId: string) {
    await db.insert(orders).values({
      restaurantId,
      customerId,
      type: "PICKUP",
      subtotal: 1000,
      total: 1000,
      customerName: "Cliente Teste",
      customerPhone: "11999999999",
    });
  }

  it("deve permitir acesso via Reservation apenas ao Restaurant relacionado", async () => {
    const first = await createRestaurant("R1", 1);
    const second = await createRestaurant("R2", 1);
    const reservation = await createReservation(
      first.restaurant.id,
      first.table.id,
      "11911111111",
      "2026-08-20T19:00:00Z",
    );

    const ownerResponse = await app.inject({
      method: "GET",
      url: `/restaurants/${first.restaurant.id}/customers/${reservation.customerId}`,
    });
    expect(ownerResponse.statusCode).toBe(200);
    expect(ownerResponse.json().id).toBe(reservation.customerId);

    const crossTenantResponse = await app.inject({
      method: "GET",
      url: `/restaurants/${second.restaurant.id}/customers/${reservation.customerId}`,
    });
    expect(crossTenantResponse.statusCode).toBe(404);
  });

  it("deve permitir acesso via Order e retornar Reservations vazias", async () => {
    const { restaurant } = await createRestaurant("R1", 1);
    const [customer] = await db
      .insert(customers)
      .values({ name: "Cliente Order", phone: "11922222222" })
      .returning();
    await createOrder(customer.id, restaurant.id);

    const customerResponse = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/customers/${customer.id}`,
    });
    expect(customerResponse.statusCode).toBe(200);

    const reservationsResponse = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/customers/${customer.id}/reservations`,
    });
    expect(reservationsResponse.statusCode).toBe(200);
    expect(reservationsResponse.json()).toEqual([]);
  });

  it("deve permitir acesso pelos dois Restaurants relacionados", async () => {
    const first = await createRestaurant("R1", 1);
    const second = await createRestaurant("R2", 1);
    const reservation = await createReservation(
      first.restaurant.id,
      first.table.id,
      "11933333333",
      "2026-08-20T19:00:00Z",
    );
    await createOrder(reservation.customerId, second.restaurant.id);

    const firstResponse = await app.inject({
      method: "GET",
      url: `/restaurants/${first.restaurant.id}/customers/${reservation.customerId}`,
    });
    const secondResponse = await app.inject({
      method: "GET",
      url: `/restaurants/${second.restaurant.id}/customers/${reservation.customerId}`,
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
  });

  it("deve listar somente Reservations do Restaurant informado", async () => {
    const first = await createRestaurant("R1", 1);
    const second = await createRestaurant("R2", 1);
    const firstReservation = await createReservation(
      first.restaurant.id,
      first.table.id,
      "11944444444",
      "2026-08-22T19:00:00Z",
    );
    const secondReservation = await createReservation(
      second.restaurant.id,
      second.table.id,
      "11944444444",
      "2026-08-21T19:00:00Z",
    );

    const firstResponse = await app.inject({
      method: "GET",
      url: `/restaurants/${first.restaurant.id}/customers/${firstReservation.customerId}/reservations`,
    });
    const secondResponse = await app.inject({
      method: "GET",
      url: `/restaurants/${second.restaurant.id}/customers/${firstReservation.customerId}/reservations`,
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(firstResponse.json().map((item: { id: string }) => item.id)).toEqual([
      firstReservation.id,
    ]);
    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.json().map((item: { id: string }) => item.id)).toEqual([
      secondReservation.id,
    ]);
  });

  it("deve preservar ordenação por startsAt e id", async () => {
    const { restaurant, table } = await createRestaurant("R1", 1);
    const first = await createReservation(
      restaurant.id,
      table.id,
      "11955555555",
      "2026-08-22T19:00:00Z",
    );
    const second = await createReservation(
      restaurant.id,
      table.id,
      "11955555555",
      "2026-08-21T19:00:00Z",
    );

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/customers/${first.customerId}/reservations`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().map((item: { id: string }) => item.id)).toEqual([
      second.id,
      first.id,
    ]);
  });

  it("deve ocultar Customer existente sem relacionamento e Customer inexistente", async () => {
    const { restaurant } = await createRestaurant("R1", 1);
    const [customer] = await db
      .insert(customers)
      .values({ name: "Sem Relação", phone: "11966666666" })
      .returning();

    for (const customerId of [customer.id, randomUUID()]) {
      const customerResponse = await app.inject({
        method: "GET",
        url: `/restaurants/${restaurant.id}/customers/${customerId}`,
      });
      const reservationsResponse = await app.inject({
        method: "GET",
        url: `/restaurants/${restaurant.id}/customers/${customerId}/reservations`,
      });

      expect(customerResponse.statusCode).toBe(404);
      expect(reservationsResponse.statusCode).toBe(404);
    }
  });

  it("deve remover rotas globais e validar UUIDs nas rotas tenant-aware", async () => {
    const customerId = randomUUID();
    const restaurantId = randomUUID();

    const oldCustomerResponse = await app.inject({
      method: "GET",
      url: `/customers/${customerId}`,
    });
    const oldReservationsResponse = await app.inject({
      method: "GET",
      url: `/customers/${customerId}/reservations`,
    });
    const invalidCustomerResponse = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurantId}/customers/invalid-uuid`,
    });
    const invalidRestaurantResponse = await app.inject({
      method: "GET",
      url: `/restaurants/invalid-uuid/customers/${customerId}`,
    });

    expect(oldCustomerResponse.statusCode).toBe(404);
    expect(oldReservationsResponse.statusCode).toBe(404);
    expect(invalidCustomerResponse.statusCode).toBe(400);
    expect(invalidRestaurantResponse.statusCode).toBe(400);
  });
});
