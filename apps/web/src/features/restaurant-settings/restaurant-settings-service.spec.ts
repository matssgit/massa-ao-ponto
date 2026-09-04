import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../lib/api-client";
import { RestaurantSettingsService, restaurantSchema, restaurantSettingsInputSchema } from "./restaurant-settings-service";

const restaurantId = "11111111-1111-4111-8111-111111111111";
const timestamp = "2026-09-04T12:00:00.000Z";
const restaurant = { id: restaurantId, name: "Massa Centro", address: "Rua A, 10", phone: "11999999999", timezone: "America/Sao_Paulo", createdAt: timestamp, updatedAt: timestamp };

describe("RestaurantSettingsService", () => {
  it("validates the real Restaurant detail contract", () => {
    expect(restaurantSchema.parse(restaurant)).toEqual(restaurant);
    expect(() => restaurantSchema.parse({ ...restaurant, timezone: null })).toThrow();
  });

  it("reads the tenant-scoped Restaurant detail", async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json(restaurant));
    await new RestaurantSettingsService(new ApiClient("https://api.example.com", transport)).get(restaurantId);
    expect(String(transport.mock.calls[0][0])).toBe(`https://api.example.com/restaurants/${restaurantId}`);
    expect(transport.mock.calls[0][1]?.method).toBe("GET");
  });

  it("sends only supplied editable fields through PATCH", async () => {
    const transport = vi.fn<typeof fetch>(async (_input, init) => Response.json({ ...restaurant, ...JSON.parse(String(init?.body)) }));
    const client = new ApiClient("https://api.example.com", transport); client.setCsrfToken("csrf");
    await new RestaurantSettingsService(client).update(restaurantId, { name: "Massa Norte" });
    expect(transport.mock.calls[0][1]).toMatchObject({ method: "PATCH", body: JSON.stringify({ name: "Massa Norte" }) });
  });

  it("trims input and enforces the physical field limits", () => {
    expect(restaurantSettingsInputSchema.parse({ name: " Casa ", address: " Rua ", phone: " 11 ", timezone: " UTC " })).toEqual({ name: "Casa", address: "Rua", phone: "11", timezone: "UTC" });
    expect(() => restaurantSettingsInputSchema.parse({ name: "A", address: "B", phone: "1", timezone: "x".repeat(101) })).toThrow();
  });
});
