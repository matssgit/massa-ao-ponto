import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  deliveries,
  deliveryHistory,
  orderHistory,
  orderItems,
  orders,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { eq } from "drizzle-orm";
import { restaurants } from "../../../src/db/schema/index.js";

describe("Restaurants (E2E)", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // Garante isolamento de estado entre os testes E2E limpando o banco antes de cada it()
  beforeEach(async () => {
    await db.delete(deliveryHistory);
    await db.delete(deliveries);
    await db.delete(orderHistory);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(restaurants);
  });

  it("should be able to create a new restaurant", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/restaurants",
      payload: {
        name: "Massa ao Ponto E2E",
        address: "Rua de Teste, 123",
        phone: "11999999999",
        timezone: "America/Sao_Paulo",
      },
    });

    expect(response.statusCode).toBe(201);

    const responseBody = response.json();
    expect(responseBody).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: "Massa ao Ponto E2E",
      }),
    );

    const [restaurantInDb] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, responseBody.id));

    expect(restaurantInDb).toBeTruthy();
    expect(restaurantInDb.name).toBe("Massa ao Ponto E2E");
  });

  it("should not create a restaurant with invalid payload", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/restaurants",
      payload: {
        name: "",
        address: "Rua de Teste, 123",
      },
    });

    expect(response.statusCode).toBe(400);

    const responseBody = response.json();
    expect(responseBody.message).toBe("Validation error.");
  });

  it("should return an empty list when there are no restaurants", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/restaurants",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("should be able to list existing restaurants", async () => {
    await app.inject({
      method: "POST",
      url: "/restaurants",
      payload: {
        name: "Restaurant 1",
        address: "Address 1",
        phone: "123",
        timezone: "UTC",
      },
    });

    await app.inject({
      method: "POST",
      url: "/restaurants",
      payload: {
        name: "Restaurant 2",
        address: "Address 2",
        phone: "456",
        timezone: "UTC",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/restaurants",
    });

    expect(response.statusCode).toBe(200);

    const responseBody = response.json();
    expect(responseBody).toHaveLength(2);
    expect(responseBody).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Restaurant 1" }),
        expect.objectContaining({ name: "Restaurant 2" }),
      ]),
    );
  });

  it("should be able to get a restaurant by id", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/restaurants",
      payload: {
        name: "Get Restaurant E2E",
        address: "Rua Principal",
        phone: "123456789",
        timezone: "UTC",
      },
    });

    const createdRestaurant = createResponse.json();

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${createdRestaurant.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({
        id: createdRestaurant.id,
        name: "Get Restaurant E2E",
      }),
    );
  });

  it("should not be able to get a restaurant with a non-existing id", async () => {
    const randomUuid = "c85d7c92-75d3-4e1b-8f3e-52b86ea9a7f3";
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${randomUuid}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().message).toEqual("Restaurant not found.");
  });
});
