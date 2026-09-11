import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../app/app";
import { ApiClient } from "../../lib/api-client";
import { AuthService, type Membership } from "../auth/auth-service";
import { deliveryId, orderDetail, restaurantA, restaurantB } from "../orders/orders.test-data";
import type { OrderStatus, OrderType, OrdersList } from "../orders/orders-service";
import { elapsedTime } from "./kitchen-page";

type Entry = OrdersList["data"][number];

function entry(status: OrderStatus, index: number, type: OrderType = "PICKUP"): Entry {
  const detail = orderDetail();
  const id = `${String(index).padStart(8, "0")}-3333-4333-8333-${String(index).padStart(12, "0")}`;
  return {
    order: { ...detail.order, id, status, type, customerName: `Cliente ${index}`, createdAt: "2026-09-11T10:00:00.000Z" },
    items: [{ ...detail.items[0], id, orderId: id, addons: index === 2 ? [{ id: deliveryId, addonId: deliveryId, addonName: "Borda", unitPrice: 500, quantity: 1, subtotal: 500, createdAt: detail.items[0].createdAt }] : [] }],
  };
}

function page(data: Entry[]) {
  return { data, meta: { page: 1, limit: 100, total: data.length, totalPages: data.length ? 1 : 0, hasNext: false, hasPrevious: false } };
}

function fixture(options: {
  role?: Membership["role"];
  memberships?: Membership[];
  entries?: Entry[];
  list?: (url: URL, init?: RequestInit) => Response | Promise<Response> | undefined;
} = {}) {
  let entries = options.entries ?? [];
  const memberships = options.memberships ?? [{ restaurantId: restaurantA, role: options.role ?? "OWNER" }];
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/session") return Response.json({ user: { id: restaurantA, email: "cook@example.com" }, csrfToken: "kitchen-csrf", memberships });
    if (url.pathname === "/restaurants") return Response.json([{ id: restaurantA, name: "Centro" }, { id: restaurantB, name: "Norte" }]);
    if (url.pathname.endsWith("/orders") && (init?.method ?? "GET") === "GET") {
      const custom = options.list?.(url, init);
      if (custom) return custom;
      const status = url.searchParams.get("status");
      return Response.json(page(entries.filter(item => item.order.status === status)));
    }
    if (url.pathname.endsWith("/status") && init?.method === "PATCH") {
      const orderId = url.pathname.split("/").at(-2);
      const body = JSON.parse(String(init.body)) as { status: OrderStatus };
      entries = entries.map(item => item.order.id === orderId ? { ...item, order: { ...item.order, status: body.status } } : item);
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url.pathname}`);
  });
  const view = render(<MemoryRouter initialEntries={["/cozinha"]}><App service={new AuthService(new ApiClient("https://api.example.com", transport))} /></MemoryRouter>);
  const orderRequests = () => transport.mock.calls.filter(([input]) => new URL(String(input)).pathname.includes("/orders"));
  return { ...view, transport, orderRequests };
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Kitchen Queue", () => {
  it.each(["OWNER", "STAFF"] as const)("%s accesses the operational route and navigation", async (role) => {
    fixture({ role });
    expect(await screen.findByRole("heading", { name: "Cozinha" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Cozinha/ })).toBeTruthy();
  });

  it("distributes active orders, hides terminal states and renders operational snapshots", async () => {
    vi.setSystemTime(new Date("2026-09-11T11:05:00.000Z"));
    const active = [entry("PENDING", 1), entry("CONFIRMED", 2, "DELIVERY"), entry("PREPARING", 3, "DINE_IN"), entry("READY", 4)];
    const terminal = [entry("CANCELLED", 5), entry("DELIVERED", 6)];
    fixture({ entries: [...active, ...terminal], list: (url) => {
      const status = url.searchParams.get("status");
      return Response.json(page([...active.filter(item => item.order.status === status), ...terminal]));
    } });
    await screen.findByText("4 comandas ativas.");
    for (const heading of ["Entrada", "Confirmados", "Em preparo", "Prontos"]) expect(screen.getByRole("heading", { name: new RegExp(heading) })).toBeTruthy();
    expect(screen.getByText("Entrega · Cliente 2")).toBeTruthy();
    expect(screen.getByText("1× Borda")).toBeTruthy();
    expect(screen.getAllByText("Observação:").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1h 05min").length).toBeGreaterThan(0);
    expect(screen.queryByText("Cliente 5")).toBeNull();
    expect(screen.queryByText("Cliente 6")).toBeNull();
  });

  it("advances CONFIRMED to PREPARING and then READY through the existing endpoint", async () => {
    const { orderRequests } = fixture({ role: "STAFF", entries: [entry("CONFIRMED", 2)] });
    await userEvent.click(await screen.findByRole("button", { name: "Iniciar preparo" }));
    await userEvent.click(await screen.findByRole("button", { name: "Marcar como pronto" }));
    await screen.findByText("1 comanda ativa.");
    const writes = orderRequests().filter(([, init]) => init?.method === "PATCH");
    expect(writes.map(([, init]) => init?.body)).toEqual([
      JSON.stringify({ status: "PREPARING" }),
      JSON.stringify({ status: "READY" }),
    ]);
    expect(new Headers(writes[0][1]?.headers).get("X-CSRF-Token")).toBe("kitchen-csrf");
  });

  it("refreshes manually and does not overlap polling requests", async () => {
    const interval = vi.spyOn(window, "setInterval");
    let block = false;
    const { orderRequests } = fixture({ list: (url) => block && url.searchParams.get("status") === "PENDING" ? new Promise<Response>(() => {}) : Response.json(page([])) });
    await screen.findByText("Nenhuma comanda ativa.");
    await userEvent.click(screen.getByRole("button", { name: "Atualizar agora" }));
    await waitFor(() => expect(orderRequests()).toHaveLength(8));
    await screen.findByRole("button", { name: "Atualizar agora" });
    const poll = interval.mock.calls.find(([, timeout]) => timeout === 20_000)?.[0];
    block = true;
    await act(async () => { if (typeof poll === "function") poll(); await Promise.resolve(); });
    expect(orderRequests()).toHaveLength(12);
    await act(async () => { if (typeof poll === "function") poll(); await Promise.resolve(); });
    expect(orderRequests()).toHaveLength(12);
    expect(screen.getByRole("button", { name: "Atualizando fila…" }).hasAttribute("disabled")).toBe(true);
  });

  it("clears the previous tenant and aborts stale requests when Restaurant changes", async () => {
    let resolve: (response: Response) => void = () => {};
    const oldRequests: RequestInit[] = [];
    const { orderRequests } = fixture({
      memberships: [{ restaurantId: restaurantA, role: "OWNER" }, { restaurantId: restaurantB, role: "STAFF" }],
      list: (url, init) => {
        if (url.pathname.includes(restaurantA)) {
          oldRequests.push(init ?? {});
          return new Promise<Response>(done => { resolve = done; });
        }
        return Response.json(page(url.searchParams.get("status") === "READY" ? [{ ...entry("READY", 8), order: { ...entry("READY", 8).order, restaurantId: restaurantB, customerName: "Cliente Norte" } }] : []));
      },
    });
    await screen.findByText("Qual casa vamos acompanhar?");
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantA);
    await screen.findByText("Carregando fila da cozinha…");
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantB);
    expect(await screen.findByText(/Cliente Norte/)).toBeTruthy();
    expect(oldRequests.every(init => init.signal?.aborted)).toBe(true);
    await act(async () => resolve(Response.json(page([entry("READY", 1)]))));
    expect(screen.queryByText(/Cliente 1/)).toBeNull();
    expect(orderRequests().some(([input]) => new URL(String(input)).pathname.includes(restaurantB))).toBe(true);
  });

  it("formats elapsed time without adding an SLA", () => {
    expect(elapsedTime("2026-09-11T10:57:00.000Z", new Date("2026-09-11T11:05:00.000Z").getTime())).toBe("8 min");
    expect(elapsedTime("2026-09-11T09:43:00.000Z", new Date("2026-09-11T11:05:00.000Z").getTime())).toBe("1h 22min");
  });
});
