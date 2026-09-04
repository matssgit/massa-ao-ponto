import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../lib/api-client";
import { customerEmail, formatCustomerPhone } from "./customer-labels";
import { customerSchema, CustomersService } from "./customers-service";

const restaurantId = "11111111-1111-4111-8111-111111111111";
const customerId = "22222222-2222-4222-8222-222222222222";
const customer = { id: customerId, name: "Ana Silva", phone: "11912345678", email: "ana@example.com" };

describe("Customer API and formatting contracts", () => {
  it("sends search and pagination to the tenant route", async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({
      data: [customer],
      meta: { page: 2, limit: 50, total: 51, totalPages: 2, hasNext: false, hasPrevious: true },
    }));
    const service = new CustomersService(new ApiClient("https://api.example.com", transport));
    await service.list(restaurantId, { search: "Ana + Silva", page: 2, limit: 50 });
    const url = new URL(String(transport.mock.calls[0][0]));
    expect(url.pathname).toBe(`/restaurants/${restaurantId}/customers`);
    expect(Object.fromEntries(url.searchParams)).toEqual({ page: "2", limit: "50", search: "Ana + Silva" });
  });

  it("uses the tenant-aware detail endpoint", async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json(customer));
    const service = new CustomersService(new ApiClient("https://api.example.com", transport));
    await expect(service.detail(restaurantId, customerId)).resolves.toEqual(customer);
    expect(new URL(String(transport.mock.calls[0][0])).pathname).toBe(`/restaurants/${restaurantId}/customers/${customerId}`);
  });

  it("rejects malformed list and detail responses", async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({}));
    const service = new CustomersService(new ApiClient("https://api.example.com", transport));
    await expect(service.list(restaurantId, { page: 1, limit: 20 })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(service.detail(restaurantId, customerId)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("requires explicit nullable email and canonical customer fields", () => {
    expect(customerSchema.safeParse({ ...customer, email: null }).success).toBe(true);
    expect(customerSchema.safeParse({ ...customer, email: undefined }).success).toBe(false);
    expect(customerSchema.safeParse({ ...customer, id: "not-a-uuid" }).success).toBe(false);
  });

  it("formats canonical Brazilian phones without corrupting unexpected values", () => {
    expect(formatCustomerPhone("11912345678")).toBe("(11) 91234-5678");
    expect(formatCustomerPhone("1134567890")).toBe("(11) 3456-7890");
    expect(formatCustomerPhone("123")).toBe("123");
    expect(customerEmail(null)).toBe("Não informado");
  });
});
