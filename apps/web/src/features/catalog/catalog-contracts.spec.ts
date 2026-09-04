import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../lib/api-client";
import { centsToInput, formatCatalogMoney, inputToCents } from "./catalog-money";
import { CatalogService, addonSchema, categorySchema, productSchema } from "./catalog-service";

const restaurantId = "11111111-1111-4111-8111-111111111111";
const productId = "22222222-2222-4222-8222-222222222222";
const addonId = "33333333-3333-4333-8333-333333333333";
const timestamp = "2026-09-04T12:00:00.000Z";

describe("Catalog contracts", () => {
  it("converts display prices to integer cents without floating-point arithmetic", () => {
    expect(inputToCents("12,34")).toBe(1234);
    expect(inputToCents("12.3")).toBe(1230);
    expect(centsToInput(1234)).toBe("12,34");
    expect(formatCatalogMoney(1234)).toContain("12,34");
    expect(() => inputToCents("1,234")).toThrow();
    expect(() => inputToCents("-1")).toThrow();
  });

  it("validates complete category, product and addon read models", () => {
    const base = { id: productId, restaurantId, name: "Item", description: null, active: true, createdAt: timestamp, updatedAt: timestamp };
    expect(categorySchema.safeParse({ ...base, displayOrder: 0 }).success).toBe(true);
    expect(productSchema.safeParse({ ...base, categoryId: addonId, price: 100, displayOrder: 0 }).success).toBe(true);
    expect(addonSchema.safeParse({ ...base, price: 100 }).success).toBe(true);
    expect(productSchema.safeParse({ ...base, categoryId: addonId, price: 1.5, displayOrder: 0 }).success).toBe(false);
  });

  it("uses tenant-aware CRUD routes and validates mutation responses", async () => {
    const category = { id: addonId, restaurantId, name: "Pizzas", description: null, active: true, displayOrder: 0, createdAt: timestamp, updatedAt: timestamp };
    const transport = vi.fn<typeof fetch>(async () => Response.json(category));
    const client = new ApiClient("https://api.example.com", transport); client.setCsrfToken("csrf");
    const service = new CatalogService(client);
    await service.saveCategory(restaurantId, { name: "Pizzas", description: null, displayOrder: 0 });
    await service.saveCategory(restaurantId, { name: "Doces", description: null, displayOrder: 1, active: true }, addonId);
    expect(transport.mock.calls.map(([input, init]) => [new URL(String(input)).pathname, init?.method])).toEqual([
      [`/restaurants/${restaurantId}/product-categories`, "POST"],
      [`/restaurants/${restaurantId}/product-categories/${addonId}`, "PATCH"],
    ]);
  });

  it("accepts the existing empty 201 association response only when opted in", async () => {
    const transport = vi.fn<typeof fetch>(async () => new Response(null, { status: 201 }));
    const client = new ApiClient("https://api.example.com", transport); client.setCsrfToken("csrf");
    const service = new CatalogService(client);
    await expect(service.setProductAddon(restaurantId, productId, addonId, true)).resolves.toBeUndefined();
    await expect(client.request("/unexpected-empty", { method: "POST" })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("rejects malformed list responses", async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ data: [] }));
    const service = new CatalogService(new ApiClient("https://api.example.com", transport));
    await expect(service.listProducts(restaurantId)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(service.listCategories(restaurantId)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(service.listAddons(restaurantId)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
