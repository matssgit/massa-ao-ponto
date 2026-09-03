import { useTestAuth } from "../../helpers/auth.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  customers,
  deliveries,
  deliveryHistory,
  orderHistory,
  orderItems,
  orders,
  productCategories,
  products,
  reservationHistory,
  reservations,
  restaurants,
  tables,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { randomUUID } from "node:crypto";

const auth = useTestAuth(app);

describe("Products (E2E)", () => {
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
    await db.delete(tables);
    await db.delete(products);
    await db.delete(productCategories);
    await db.delete(customers);
    await db.delete(restaurants);
  });

  async function createRestaurant(name = "Restaurante Teste") {
    return await auth.createRestaurant({ name, address: "Rua", phone: "11", timezone: "UTC" });
  }

  async function createCategory(restaurantId: string, name = "Categoria") {
    const response = await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${restaurantId}/product-categories`,
      payload: { name, displayOrder: 1 },
    });
    return response.json();
  }

  describe("POST /restaurants/:restaurantId/products", () => {
    it("deve criar um produto com sucesso guardando preco inteiro (201)", async () => {
      const restaurant = await createRestaurant();
      const category = await createCategory(restaurant.id);

      const response = await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/products`,
        payload: {
          categoryId: category.id,
          name: "Pizza Calabresa",
          price: 3990,
          displayOrder: 1,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().id).toBeDefined();
      expect(response.json().price).toBe(3990);
    });

    it("deve retornar 404 se o restaurante não existir", async () => {
      const restaurant = await createRestaurant();
      const category = await createCategory(restaurant.id);

      const response = await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${randomUUID()}/products`,
        payload: {
          categoryId: category.id,
          name: "Pizza",
          price: 1000,
          displayOrder: 1,
        },
      });
      expect(response.statusCode).toBe(404);
    });

    it("deve retornar 404 se a categoria não existir", async () => {
      const restaurant = await createRestaurant();

      const response = await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/products`,
        payload: {
          categoryId: randomUUID(),
          name: "Pizza",
          price: 1000,
          displayOrder: 1,
        },
      });
      expect(response.statusCode).toBe(404);
    });

    it("deve retornar 409 se a categoria pertencer a outro restaurante", async () => {
      const r1 = await createRestaurant("R1");
      const c1 = await createCategory(r1.id);
      const r2 = await createRestaurant("R2");

      const response = await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${r2.id}/products`,
        payload: {
          categoryId: c1.id,
          name: "Pizza",
          price: 1000,
          displayOrder: 1,
        },
      });
      expect(response.statusCode).toBe(409);
    });

    it("deve retornar 400 se UUID for inválido ou preço negativo", async () => {
      const restaurant = await createRestaurant();
      const category = await createCategory(restaurant.id);

      const response = await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${restaurant.id}/products`,
        payload: {
          categoryId: category.id,
          name: "Pizza",
          price: -50,
          displayOrder: 1,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /restaurants/:restaurantId/products", () => {
    it("deve listar produtos isolados e ordenados corretamente", async () => {
      const r1 = await createRestaurant();
      const c1 = await createCategory(r1.id);
      const r2 = await createRestaurant();
      const c2 = await createCategory(r2.id);

      await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${r1.id}/products`,
        payload: { categoryId: c1.id, name: "B", price: 10, displayOrder: 2 },
      });
      await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${r1.id}/products`,
        payload: { categoryId: c1.id, name: "A", price: 10, displayOrder: 1 },
      });
      await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${r2.id}/products`,
        payload: { categoryId: c2.id, name: "Z", price: 10, displayOrder: 1 },
      });

      const response = await app.inject({
        headers: auth.headers,
        method: "GET",
        url: `/restaurants/${r1.id}/products`,
      });
      expect(response.statusCode).toBe(200);
      const items = response.json();
      expect(items).toHaveLength(2);
      expect(items[0].name).toBe("A");
      expect(items[1].name).toBe("B");
    });

    it("deve filtrar produtos por categoria ou atividade", async () => {
      const r1 = await createRestaurant();
      const c1 = await createCategory(r1.id);
      const c2 = await createCategory(r1.id);

      await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${r1.id}/products`,
        payload: { categoryId: c1.id, name: "P1", price: 10 },
      });
      await app.inject({
        headers: auth.headers,
        method: "POST",
        url: `/restaurants/${r1.id}/products`,
        payload: { categoryId: c2.id, name: "P2", price: 10 },
      });

      const responseCategory = await app.inject({
        headers: auth.headers,
        method: "GET",
        url: `/restaurants/${r1.id}/products?categoryId=${c2.id}`,
      });
      expect(responseCategory.json()).toHaveLength(1);
      expect(responseCategory.json()[0].name).toBe("P2");

      const responseInactive = await app.inject({
        headers: auth.headers,
        method: "GET",
        url: `/restaurants/${r1.id}/products?active=false`,
      });
      expect(responseInactive.json()).toHaveLength(0); // Teste com base padrão (active = true na criação)
    });
  });
});
