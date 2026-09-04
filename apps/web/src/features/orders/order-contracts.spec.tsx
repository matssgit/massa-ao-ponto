import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../lib/api-client";
import { availableActions, OrderActions } from "./order-actions";
import { money } from "./order-labels";
import { OrdersService, orderDetailsSchema } from "./orders-service";
import { createdAt, deliveryDetail, deliveryId, orderDetail, orderId, restaurantA, restaurantB } from "./orders.test-data";

describe("Order actions and contracts", () => {
  it.each(["PICKUP", "DINE_IN"] as const)("offers direct READY completion only for %s", (type) => {
    const detail = orderDetail();
    detail.order = { ...detail.order, type, status: "READY" };
    expect(availableActions(detail, false).map(({ action }) => action)).toEqual([{ kind: "status", status: "DELIVERED" }]);
  });

  it.each([
    ["PENDING", "CONFIRMED"], ["CONFIRMED", "PREPARING"], ["PREPARING", "READY"],
  ] as const)("offers only the next kitchen status for %s", (status, next) => {
    const detail = orderDetail();
    detail.order.status = status;
    expect(availableActions(detail, true).filter(({ action }) => action.kind === "status").map(({ action }) => action)).toEqual([{ kind: "status", status: next }]);
  });

  it.each(["DELIVERED", "CANCELLED"] as const)("does not offer payment, cancellation or advancement on terminal %s", (status) => {
    const detail = orderDetail();
    detail.order.status = status;
    expect(availableActions(detail, true)).toEqual([]);
  });

  it("does not offer cancellation or payment for a paid order", () => {
    const detail = orderDetail();
    detail.order.paymentStatus = "PAID";
    expect(availableActions(detail, true).map(({ action }) => action.kind)).toEqual(["status"]);
  });

  it("does not offer delivery creation before preparation or with an incomplete address", () => {
    const detail = deliveryDetail();
    expect(availableActions(detail, false).some(({ action }) => action.kind === "create-delivery")).toBe(true);
    detail.order.deliveryCity = null;
    expect(availableActions(detail, false).some(({ action }) => action.kind === "create-delivery")).toBe(false);
    detail.order.deliveryCity = "São Paulo";
    detail.order.status = "CONFIRMED";
    expect(availableActions(detail, false).some(({ action }) => action.kind === "create-delivery")).toBe(false);
  });

  it("requires compatible Order and Delivery states for dispatch actions", () => {
    const detail = deliveryDetail();
    detail.delivery = { id: deliveryId, orderId, status: "PENDING", createdAt, updatedAt: createdAt, history: [] };
    expect(availableActions(detail, false).map(({ action }) => action.kind)).toEqual(["status"]);
    detail.order.status = "READY";
    expect(availableActions(detail, false).map(({ action }) => action.kind)).toEqual(["start-delivery"]);
    detail.delivery.status = "OUT_FOR_DELIVERY";
    expect(availableActions(detail, false)).toEqual([]);
    detail.order.status = "OUT_FOR_DELIVERY";
    expect(availableActions(detail, false).map(({ action }) => action.kind)).toEqual(["complete-delivery"]);
  });

  it("removes a pending payment confirmation if current role loses access", async () => {
    const detail = orderDetail();
    const onAction = vi.fn();
    const { rerender } = render(<OrderActions detail={detail} owner busy={false} onAction={onAction} />);
    await userEvent.click(screen.getByRole("button", { name: "Registrar pagamento" }));
    expect(screen.getByRole("button", { name: "Confirmar pagamento" })).toBeTruthy();
    rerender(<OrderActions detail={detail} owner={false} busy={false} onAction={onAction} />);
    expect(screen.queryByRole("button", { name: "Confirmar pagamento" })).toBeNull();
    expect(onAction).not.toHaveBeenCalled();
  });

  it.each([[0, "R$ 0,00"], [1, "R$ 0,01"], [123450, "R$ 1.234,50"]])("formats %s cents without changing financial values", (value, expected) => {
    expect(money(Number(value)).replace(/\s/g, " ")).toBe(expected);
  });

  it("supports customerId in the service without loading global customers", async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false } }));
    const service = new OrdersService(new ApiClient("https://api.example.com", transport));
    await service.list(restaurantA, { page: 1, limit: 20, customerId: restaurantB });
    expect(new URL(String(transport.mock.calls[0][0])).searchParams.get("customerId")).toBe(restaurantB);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("preserves explicit delivery null and rejects invalid status/dates/addon null", () => {
    const detail = orderDetail();
    expect(orderDetailsSchema.parse(detail).delivery).toBeNull();
    expect(orderDetailsSchema.safeParse({ ...detail, order: { ...detail.order, status: "UNKNOWN" } }).success).toBe(false);
    expect(orderDetailsSchema.safeParse({ ...detail, order: { ...detail.order, createdAt: "invalid" } }).success).toBe(false);
    expect(orderDetailsSchema.safeParse({ ...detail, items: [{ ...detail.items[0], addons: null }] }).success).toBe(false);
  });

  it("rejects malformed mutation responses without silently claiming success", async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({}));
    const client = new ApiClient("https://api.example.com", transport);
    client.setCsrfToken("test");
    const service = new OrdersService(client);
    await expect(service.mutate(restaurantA, orderId, { kind: "status", status: "CONFIRMED" })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(service.mutate(restaurantA, orderId, { kind: "payment" })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
