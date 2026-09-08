import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../lib/api-client";
import { PublicReservationService } from "./service";
import { reservationPeriod, zonedInstant } from "./dates";
import { availabilitySchema, createdSchema, customerFormSchema, detailsSchema, publicCatalogSchema } from "./schemas";
export const token = "a".repeat(43);
export const restaurant = { name: "Casa do Forno", slug: "casa-do-forno", address: "Rua das Oliveiras, 42", phone: "11987654321", timezone: "America/Sao_Paulo" };
export const table = { id: "11111111-1111-4111-8111-111111111111", number: "7", capacity: 4, type: "table" };
export const details = { restaurant, table: { number: "7", capacity: 4, type: "table" }, reservation: { status: "SCHEDULED", partySize: 2, startsAt: "2030-09-10T22:00:00.000Z", endsAt: "2030-09-11T00:00:00.000Z", notes: null } };
export const catalog = { categories: [{ id: "22222222-2222-4222-8222-222222222222", name: "Pizzas", displayOrder: 1, products: [{ id: "33333333-3333-4333-8333-333333333333", categoryId: "22222222-2222-4222-8222-222222222222", name: "Margherita", description: "Molho, queijo e manjericão", price: 4590, displayOrder: 1, addons: [{ id: "44444444-4444-4444-8444-444444444444", name: "Borda recheada", description: null, price: 800 }] }] }] };

describe("Public reservation contracts", () => {
  it("uses exact public endpoints with no cookies or CSRF, no referrer, and required write header", async () => {
    const transport = vi.fn<typeof fetch>(async (input, init) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith("availability")) return Response.json([table]);
      if (path.endsWith("/catalog")) return Response.json(catalog);
      if (path === "/public/restaurants/casa-do-forno") return Response.json(restaurant);
      if (path.endsWith("/reservations") && init?.method === "POST") return Response.json({ ...details, accessToken: token });
      return Response.json(details);
    });
    const client = new ApiClient("https://api.example.com", transport); client.setCsrfToken("admin-secret");
    const service = new PublicReservationService(client);
    await service.restaurant("casa-do-forno");
    await service.catalog("casa-do-forno");
    const period = reservationPeriod("3", "2030-09-10T19:00", "2030-09-10T21:00", restaurant.timezone);
    await service.availability("casa-do-forno", period);
    await service.create("casa-do-forno", { ...period, tableId: table.id, customer: { name: "Maria", phone: "(11) 98765-4321" } });
    await service.lookup(token); await service.cancel(token);
    for (const [, init] of transport.mock.calls) {
      expect(init?.credentials).toBe("omit"); expect(init?.referrerPolicy).toBe("no-referrer");
      expect(new Headers(init?.headers).has("X-CSRF-Token")).toBe(false);
      if (init?.method === "POST") expect(new Headers(init.headers).get("X-Auth-Request")).toBe("1");
    }
    const url = new URL(String(transport.mock.calls[2][0]));
    expect(url.searchParams.get("partySize")).toBe("3");
    expect(url.searchParams.get("startsAt")).toBe("2030-09-10T22:00:00.000Z");
    expect(String(transport.mock.calls[3][1]?.body)).not.toMatch(/customerId|tokenHash/);
    expect(String(transport.mock.calls[5][0])).toBe(`https://api.example.com/public/reservations/${token}/cancel`);
  });
  it("rejects UUID ownership without sending a request", async () => {
    const transport = vi.fn<typeof fetch>(); const service = new PublicReservationService(new ApiClient("https://api.example.com", transport));
    await expect(service.lookup(table.id)).rejects.toMatchObject({ status: 404 });
    expect(transport).not.toHaveBeenCalled();
  });
  it("preserves Retry-After and does not clear admin auth on public errors", async () => {
    const client = new ApiClient("https://api.example.com", vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code: "PUBLIC_RATE_LIMIT", message: "Too many requests" }, { status: 429, headers: { "Retry-After": "90" } })));
    await expect(new PublicReservationService(client).lookup(token)).rejects.toMatchObject({ status: 429, retryAfterSeconds: 90 });
    const auth = vi.fn(); const failing = new ApiClient("https://api.example.com", vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code: "NO", message: "No" }, { status: 401 })));
    failing.onUnauthorized(auth); await expect(new PublicReservationService(failing).lookup(token)).rejects.toMatchObject({ status: 401 }); expect(auth).not.toHaveBeenCalled();
  });
  it("rejects unexpected hashes, tokens and customer data in public responses", () => {
    expect(detailsSchema.safeParse({ ...details, tokenHash: "secret" }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...details, customer: { name: "Private" } }).success).toBe(false);
    expect(detailsSchema.safeParse({ ...details, reservation: { ...details.reservation, publicAccessTokenHash: "secret" } }).success).toBe(false);
    expect(createdSchema.safeParse({ ...details, accessToken: token }).success).toBe(true);
    expect(availabilitySchema.safeParse([{ ...table, restaurantId: table.id }]).success).toBe(false);
    expect(publicCatalogSchema.safeParse(catalog).success).toBe(true);
    expect(publicCatalogSchema.safeParse({ categories: [{ ...catalog.categories[0], restaurantId: table.id }] }).success).toBe(false);
  });
  it("accepts optional email and keeps the phone for server canonicalization", () => {
    const input = { name: "Maria", phone: "(11) 98765-4321", email: "", notes: "" };
    expect(customerFormSchema.parse(input).phone).toBe(input.phone);
    expect(customerFormSchema.safeParse({ ...input, email: "invalid" }).success).toBe(false);
  });
  it("converts the Restaurant timezone independently of the device and requires explicit duration", () => {
    expect(zonedInstant("2030-09-10T19:00", "America/Sao_Paulo")).toBe("2030-09-10T22:00:00.000Z");
    expect(zonedInstant("2030-09-10T19:00", "Asia/Kolkata")).toBe("2030-09-10T13:30:00.000Z");
    expect(() => reservationPeriod("0", "2030-09-10T19:00", "2030-09-10T21:00", "UTC")).toThrow();
    expect(() => reservationPeriod("2", "2030-09-10T19:00", "", "UTC")).toThrow();
    expect(() => reservationPeriod("2", "2030-09-10T21:00", "2030-09-10T19:00", "UTC")).toThrow();
    expect(() => zonedInstant("2030-02-30T19:00", "UTC")).toThrow();
    expect(() => zonedInstant("2030-09-10T19:00", "Invalid/Timezone")).toThrow(/fuso/);
  });
  it("rejects ambiguous and nonexistent times at daylight saving transitions", () => {
    expect(() => zonedInstant("2030-03-10T02:30", "America/New_York")).toThrow(/ambíguo/);
    expect(() => zonedInstant("2030-11-03T01:30", "America/New_York")).toThrow(/ambíguo/);
  });
});
