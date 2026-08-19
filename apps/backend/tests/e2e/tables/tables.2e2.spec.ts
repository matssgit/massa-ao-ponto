import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { restaurants, tables } from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { eq } from "drizzle-orm";

describe("Tables (E2E)", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.delete(tables);
    await db.delete(restaurants);
  });

  async function createRestaurantE2E() {
    const response = await app.inject({
      method: "POST",
      url: "/restaurants",
      payload: {
        name: "Restaurant E2E",
        address: "Table Street, 123",
        phone: "123456789",
        timezone: "America/Sao_Paulo",
      },
    });
    return response.json();
  }

  it("should be able to create a new table", async () => {
    const restaurant = await createRestaurantE2E();

    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: {
        number: 12,
        capacity: 4,
        type: "table",
      },
    });

    expect(response.statusCode).toBe(201);

    const responseBody = response.json();
    expect(responseBody).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        restaurantId: restaurant.id,
        number: "12",
        capacity: 4,
        type: "table",
      }),
    );

    const [tableInDb] = await db
      .select()
      .from(tables)
      .where(eq(tables.id, responseBody.id));
    expect(tableInDb).toBeTruthy();
  });

  it("should not be able to create a table for a non-existing restaurant", async () => {
    const randomUuid = "c85d7c92-75d3-4e1b-8f3e-52b86ea9a7f3";

    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${randomUuid}/tables`,
      payload: {
        number: 12,
        capacity: 4,
        type: "table",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 400 if restaurantId is invalid", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/restaurants/invalid-uuid/tables`,
      payload: {
        number: 12,
        capacity: 4,
        type: "table",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 if payload is invalid (missing fields)", async () => {
    const restaurant = await createRestaurantE2E();

    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: {
        number: 12,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 if number or capacity are invalid", async () => {
    const restaurant = await createRestaurantE2E();

    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: {
        number: -1,
        capacity: -4,
        type: "table",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 409 if table number is duplicated in the same restaurant", async () => {
    const restaurant = await createRestaurantE2E();

    await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: {
        number: 12,
        capacity: 4,
        type: "table",
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: {
        number: 12,
        capacity: 2,
        type: "room",
      },
    });

    expect(response.statusCode).toBe(409);
  });

  it("should return empty array if restaurant has no tables", async () => {
    const restaurant = await createRestaurantE2E();

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/tables`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("should be able to list a single table for a restaurant", async () => {
    const restaurant = await createRestaurantE2E();

    await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: { number: 1, capacity: 2, type: "table" },
    });

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/tables`,
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toEqual(
      expect.objectContaining({ number: "1", capacity: 2 }),
    );
  });

  it("should be able to list multiple tables for a restaurant", async () => {
    const restaurant = await createRestaurantE2E();

    await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: { number: 1, capacity: 2, type: "table" },
    });

    await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: { number: 2, capacity: 4, type: "table" },
    });

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/tables`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(2);
  });

  it("should return 400 if restaurantId is invalid on GET", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/invalid-uuid/tables`,
    });

    expect(response.statusCode).toBe(400);
  });

  it("should not return tables from another restaurant", async () => {
    const restaurant1 = await createRestaurantE2E();
    const restaurant2 = await createRestaurantE2E();

    await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant1.id}/tables`,
      payload: { number: 1, capacity: 2, type: "table" },
    });

    await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant2.id}/tables`,
      payload: { number: 2, capacity: 4, type: "table" },
    });

    const response1 = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant1.id}/tables`,
    });

    const body1 = response1.json();
    expect(body1).toHaveLength(1);
    expect(body1[0].number).toBe("1");
    expect(body1[0].restaurantId).toBe(restaurant1.id);
  });
});
