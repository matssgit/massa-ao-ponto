import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../lib/api-client";
import { createTableInputSchema, TablesService, tableSchema } from "./tables-service";

const restaurantId = "11111111-1111-4111-8111-111111111111";
const tableId = "22222222-2222-4222-8222-222222222222";
const timestamp = "2026-09-04T12:00:00.000Z";
const table = { id: tableId, restaurantId, number: "10", capacity: 4, type: "table", active: true, createdAt: timestamp, updatedAt: timestamp };

describe("TablesService", () => {
  it("validates the real Table read model and rejects malformed responses", () => {
    expect(tableSchema.parse(table)).toEqual(table);
    expect(() => tableSchema.parse({ ...table, type: "counter" })).toThrow();
  });

  it("preserves the server ordering when listing tables", async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json([table, { ...table, id: crypto.randomUUID(), number: "2" }]));
    const result = await new TablesService(new ApiClient("https://api.example.com", transport)).list(restaurantId);
    expect(result.map((item) => item.number)).toEqual(["10", "2"]);
    expect(String(transport.mock.calls[0][0])).toBe(`https://api.example.com/restaurants/${restaurantId}/tables`);
  });

  it("normalizes create input and sends the supported payload", async () => {
    const transport = vi.fn<typeof fetch>(async (_input, init) => Response.json({ ...table, ...JSON.parse(String(init?.body)) }, { status: 201 }));
    const client = new ApiClient("https://api.example.com", transport); client.setCsrfToken("csrf");
    const input = createTableInputSchema.parse({ number: "010", capacity: 6, type: "room" });
    await new TablesService(client).create(restaurantId, input);
    expect(transport.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify({ number: "10", capacity: 6, type: "room" }) });
  });

  it("uses PATCH for partial updates without inventing a delete contract", async () => {
    const transport = vi.fn<typeof fetch>(async (_input, init) => Response.json({ ...table, ...JSON.parse(String(init?.body)) }));
    const client = new ApiClient("https://api.example.com", transport); client.setCsrfToken("csrf");
    const service = new TablesService(client);
    await service.update(restaurantId, tableId, { active: false });
    expect(transport.mock.calls[0][1]).toMatchObject({ method: "PATCH", body: JSON.stringify({ active: false }) });
    expect("delete" in service).toBe(false);
  });
});
