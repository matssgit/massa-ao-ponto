import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  deliveries,
  deliveryHistory,
  productCategories,
  products,
  restaurants,
} from "../../../src/db/schema/index.js";
import {
  orderHistory,
  orderItems,
  orders,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { randomUUID } from "node:crypto";

describe("Product Categories (E2E)", () => {
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
    await db.delete(products);
    await db.delete(productCategories);
    await db.delete(restaurants);
  });

  async function createRestaurant(name = "Restaurante Teste") {
    const response = await app.inject({
      method: "POST",
      url: "/restaurants",
      payload: {
        name,
        address: "Rua 1",
        phone: "11999999999",
        timezone: "UTC",
      },
    });
    return response.json();
  }

  describe("POST /restaurants/:restaurantId/product-categories", () => {
    it("deve criar uma categoria de produto com sucesso (201)", async () => {
      const restaurant = await createRestaurant();

      const response = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/product-categories`,
        payload: {
          name: "Pizzas Tradicionais",
          description: "As melhores",
          displayOrder: 1,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().id).toBeDefined();
      expect(response.json().name).toBe("Pizzas Tradicionais");
    });

    it("deve retornar 404 ao tentar criar categoria para restaurante inexistente", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/restaurants/${randomUUID()}/product-categories`,
        payload: { name: "Bebidas", displayOrder: 0 },
      });

      expect(response.statusCode).toBe(404);
    });

    it("deve retornar 400 se o UUID for inválido na borda", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/restaurants/invalid-uuid/product-categories",
        payload: { name: "Bebidas", displayOrder: 0 },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /restaurants/:restaurantId/product-categories", () => {
    it("deve listar as categorias do restaurante isoladamente e ordenadas", async () => {
      const restaurant1 = await createRestaurant("Restaurante 1");
      const restaurant2 = await createRestaurant("Restaurante 2");

      await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant1.id}/product-categories`,
        payload: { name: "Sobremesas", displayOrder: 2 },
      });

      await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant1.id}/product-categories`,
        payload: { name: "Pizzas", displayOrder: 1 },
      });

      // Categoria do outro restaurante
      await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant2.id}/product-categories`,
        payload: { name: "Bebidas", displayOrder: 1 },
      });

      const response = await app.inject({
        method: "GET",
        url: `/restaurants/${restaurant1.id}/product-categories`,
      });

      expect(response.statusCode).toBe(200);
      const items = response.json();
      expect(items).toHaveLength(2);
      expect(items[0].name).toBe("Pizzas");
      expect(items[1].name).toBe("Sobremesas");
    });

    it("deve retornar array vazio se não houver categorias", async () => {
      const restaurant = await createRestaurant();

      const response = await app.inject({
        method: "GET",
        url: `/restaurants/${restaurant.id}/product-categories`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });
  });
});
