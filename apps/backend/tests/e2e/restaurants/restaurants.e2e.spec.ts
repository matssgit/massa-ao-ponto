import { useTestAuth } from "../../helpers/auth.js";
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
import { restaurants } from "../../../src/db/schema/index.js";

const auth = useTestAuth(app);

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

  it("blocks common Restaurant creation even for authenticated users", async () => {
    const response = await app.inject({
      method: "POST", url: "/restaurants", headers: auth.headers,
      payload: { name: "Blocked", address: "Street", phone: "123", timezone: "UTC" },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ code: "FORBIDDEN", message: "Access denied." });
    expect(await db.select().from(restaurants)).toEqual([]);
  });

  it("requires a session for Restaurant creation", async () => {
    const response = await app.inject({
      method: "POST", url: "/restaurants",
      payload: { name: "Blocked", address: "Street" },
    });
    expect(response.statusCode).toBe(401);
    expect(await db.select().from(restaurants)).toEqual([]);
  });

  it("should return an empty list when there are no restaurants", async () => {
    const response = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: "/restaurants",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("should be able to list existing restaurants", async () => {
    await auth.createRestaurant({
        name: "Restaurant 1",
        address: "Address 1",
        phone: "123",
        timezone: "UTC",
      });

    await auth.createRestaurant({
        name: "Restaurant 2",
        address: "Address 2",
        phone: "456",
        timezone: "UTC",
      });

    const response = await app.inject({
      headers: auth.headers,
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
    const createdRestaurant = await auth.createRestaurant({
        name: "Get Restaurant E2E",
        address: "Rua Principal",
        phone: "123456789",
        timezone: "UTC",
      });

    const response = await app.inject({
      headers: auth.headers,
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
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${randomUuid}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().message).toEqual("Restaurant not found.");
  });

  it("deve atualizar todos os campos administrativos do Restaurant", async () => {
    const restaurant = await auth.createRestaurant({
        name: "Original",
        address: "Rua A",
        phone: "111",
        timezone: "UTC",
      });

    const response = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${restaurant.id}`,
      payload: {
        name: "Atualizado",
        address: "Rua B",
        phone: "222",
        timezone: "America/Sao_Paulo",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: restaurant.id,
      name: "Atualizado",
      address: "Rua B",
      phone: "222",
      timezone: "America/Sao_Paulo",
    });
  });

  it("deve aplicar atualização parcial do Restaurant", async () => {
    const restaurant = await auth.createRestaurant({
        name: "Original",
        address: "Rua A",
        phone: "111",
        timezone: "UTC",
      });

    const response = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${restaurant.id}`,
      payload: { name: "Parcial" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      name: "Parcial",
      address: "Rua A",
      phone: "111",
      timezone: "UTC",
    });
  });

  it("deve retornar 404 ao atualizar Restaurant inexistente", async () => {
    const response = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: "/restaurants/c85d7c92-75d3-4e1b-8f3e-52b86ea9a7f3",
      payload: { name: "Inexistente" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("deve ignorar campos administrativos não permitidos", async () => {
    const restaurant = await auth.createRestaurant({
        name: "Original",
        address: "Rua A",
        phone: "111",
        timezone: "UTC",
      });

    const response = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${restaurant.id}`,
      payload: {
        id: "c85d7c92-75d3-4e1b-8f3e-52b86ea9a7f3",
        createdAt: "2000-01-01T00:00:00.000Z",
        name: "Permitido",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe(restaurant.id);
    expect(response.json().createdAt).toBe(restaurant.createdAt.toISOString());
    expect(response.json().name).toBe("Permitido");
  });
});
