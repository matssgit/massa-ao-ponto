import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../app/app";
import { ApiClient } from "../../lib/api-client";
import { AuthService, type Membership } from "../auth/auth-service";
import { customPeriod } from "./period";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const summary = {
  period: { startsAt: null, endsAt: null },
  orders: { total: 7, paid: 2, pending: 1, cancelled: 2, delivered: 2 },
  revenue: 123450, averageTicket: 61725,
};
const products = [{ productId: first, productName: "Margherita", quantitySold: 4, revenue: 95000, orderCount: 3 }];
const customers = [{ customerId: first, customerName: "Ana", ordersCount: 4, paidOrdersCount: 2, totalSpent: 123450, averageTicket: 61725 }];
const categories = [{ categoryId: first, categoryName: "Pizzas", quantitySold: 4, revenue: 95000, orderCount: 3 }];
const payloads = { "sales-summary": summary, "top-products": products, "top-customers": customers, "category-performance": categories };
type Endpoint = keyof typeof payloads;
type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>;

function fixture(handlers: Partial<Record<Endpoint, Handler>> = {}, memberships: Membership[] = [{ restaurantId: first, role: "OWNER" }]) {
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/session") return Response.json({ user: { id: first, email: "owner@example.com" }, csrfToken: "csrf-test", memberships });
    if (url.pathname === "/restaurants") return Response.json([{ id: first, name: "Centro" }, { id: second, name: "Norte" }]);
    for (const endpoint of Object.keys(payloads) as Endpoint[]) {
      if (url.pathname.endsWith(`/dashboard/${endpoint}`)) return handlers[endpoint]?.(url, init) ?? Response.json(payloads[endpoint]);
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  });
  render(<MemoryRouter><App service={new AuthService(new ApiClient("https://api.example.com", transport))} /></MemoryRouter>);
  const requests = () => transport.mock.calls.filter(([url]) => String(url).includes("/dashboard/"));
  return { transport, requests };
}

function section(name: string) { return screen.getByRole("region", { name }); }

describe("Dashboard overview", () => {
  it("shows loading independently in all sections without presenting zero metrics", async () => {
    const pending = () => new Promise<Response>(() => {});
    fixture({ "sales-summary": pending, "top-products": pending, "top-customers": pending, "category-performance": pending });
    await screen.findByRole("heading", { name: "Resumo do período" });
    for (const name of ["Resumo do período", "Principais produtos", "Principais clientes", "Desempenho por categoria"]) {
      expect(within(section(name)).getByRole("status").textContent).toContain("Carregando");
    }
    expect(screen.queryByText(/R\$/)).toBeNull();
  });

  it("renders server metrics and rankings without recalculating revenue or operational totals", async () => {
    const { requests } = fixture();
    await screen.findByText("Margherita");
    const region = within(section("Resumo do período"));
    expect(region.getByText(/1\.234,50/)).toBeTruthy();
    expect(region.getByText(/617,25/)).toBeTruthy();
    expect(region.getByText("7")).toBeTruthy();
    expect(region.getByText("2")).toBeTruthy();
    expect(region.getByText(/Inclui todos os status/)).toBeTruthy();
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.getByText("4 pedidos · 2 pagos")).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "Pizzas" })).toBeTruthy();
    expect(screen.getByText(/categoria atual do produto/)).toBeTruthy();
    expect(requests()).toHaveLength(4);
    for (const [, init] of requests()) expect(init?.credentials).toBe("include");
  });

  it("shows empty rankings and genuine zero metrics only on successful empty responses", async () => {
    fixture({
      "sales-summary": () => Response.json({ ...summary, revenue: 0, averageTicket: 0, orders: { total: 0, paid: 0, cancelled: 0, pending: 0, delivered: 0 } }),
      "top-products": () => Response.json([]), "top-customers": () => Response.json([]), "category-performance": () => Response.json([]),
    });
    await screen.findByText("Nenhum pedido criado neste período.");
    expect(within(section("Resumo do período")).getAllByText(/R\$.*0,00/)).toHaveLength(2);
    expect(screen.getByText("Nenhum produto vendido neste período.")).toBeTruthy();
    expect(screen.getByText("Nenhum cliente com pedidos neste período.")).toBeTruthy();
    expect(screen.getByText("Nenhuma categoria com vendas neste período.")).toBeTruthy();
  });

  it("keeps unpaid operational activity visible even when its revenue is zero", async () => {
    fixture({
      "sales-summary": () => Response.json({ ...summary, revenue: 0, averageTicket: 0, orders: { total: 3, paid: 0, cancelled: 0, pending: 3, delivered: 0 } }),
      "top-products": () => Response.json([{ ...products[0], revenue: 0 }]),
    });
    await screen.findByText("Margherita");
    expect(screen.queryByText("Nenhum pedido criado neste período.")).toBeNull();
    expect(within(section("Principais produtos")).getByText(/R\$.*0,00/)).toBeTruthy();
    expect(screen.getByText("4 unidades · 3 pedidos")).toBeTruthy();
  });

  it("isolates errors and retries just the failed section", async () => {
    let fail = true;
    const { requests } = fixture({ "top-products": () => fail ? Response.json({ code: "INTERNAL_ERROR", message: "Error" }, { status: 500 }) : Response.json(products) });
    await screen.findByRole("alert");
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(within(section("Resumo do período")).getByText(/1\.234,50/)).toBeTruthy();
    expect(within(section("Principais produtos")).queryByText(/R\$/)).toBeNull();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: /Tentar novamente — Principais produtos/ }));
    await screen.findByText("Margherita");
    expect(requests()).toHaveLength(5);
    expect(String(requests()[4][0])).toContain("top-products");
  });

  it("does not substitute summary errors with zero", async () => {
    fixture({ "sales-summary": () => Promise.reject(new TypeError("network")) });
    await screen.findByRole("alert");
    expect(within(section("Resumo do período")).queryByText(/R\$/)).toBeNull();
    expect(screen.getByText("Margherita")).toBeTruthy();
  });

  it("treats malformed responses as errors", async () => {
    fixture({ "sales-summary": () => Response.json({ revenue: 0 }) });
    await screen.findByRole("alert");
    expect(within(section("Resumo do período")).queryByText(/R\$/)).toBeNull();
  });

  it("does not request analytics for STAFF", async () => {
    const { requests } = fixture({}, [{ restaurantId: first, role: "STAFF" }]);
    await screen.findByText(/indicadores financeiros estão disponíveis apenas para proprietários/);
    expect(requests()).toHaveLength(0);
    expect(screen.queryByRole("combobox", { name: "Período" })).toBeNull();
  });

  it("waits for an authorized restaurant and discards late results when it changes", async () => {
    let resolveOld: (response: Response) => void = () => { throw new Error("Request missing"); };
    const { requests } = fixture({ "top-products": (url) => url.pathname.includes(first)
      ? new Promise<Response>((resolve) => { resolveOld = resolve; })
      : Response.json([{ ...products[0], productName: "Produto Norte" }]) }, [
      { restaurantId: first, role: "OWNER" }, { restaurantId: second, role: "OWNER" },
    ]);
    await screen.findByRole("heading", { name: "Qual casa vamos acompanhar?" });
    expect(requests()).toHaveLength(0);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "RESTAURANTE" }), first);
    await waitFor(() => expect(requests()).toHaveLength(4));
    const oldRequests = requests();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "RESTAURANTE" }), second);
    await screen.findByText("Produto Norte");
    for (const [, init] of oldRequests) expect(init?.signal?.aborted).toBe(true);
    expect(requests().slice(4).every(([url]) => String(url).includes(second))).toBe(true);
    await act(async () => { resolveOld(Response.json([{ ...products[0], productName: "Produto antigo" }])); });
    expect(screen.queryByText("Produto antigo")).toBeNull();
    expect(screen.getByText("Produto Norte")).toBeTruthy();
  });

  it("stops analytics when switching from OWNER to a STAFF membership", async () => {
    const { requests } = fixture({}, [{ restaurantId: first, role: "OWNER" }, { restaurantId: second, role: "STAFF" }]);
    await screen.findByRole("heading", { name: "Qual casa vamos acompanhar?" });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "RESTAURANTE" }), first);
    await screen.findByText("Margherita");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "RESTAURANTE" }), second);
    await screen.findByText(/indicadores financeiros estão disponíveis apenas para proprietários/);
    expect(requests()).toHaveLength(4);
    expect(screen.queryByText("Margherita")).toBeNull();
  });

  it.each(["7days", "30days"])("sends a consistent %s interval and limit=5 for rankings", async (preset) => {
    const { requests } = fixture();
    await screen.findByText("Margherita");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Período" }), preset);
    await waitFor(() => expect(requests()).toHaveLength(8));
    const urls = requests().slice(4).map(([url]) => new URL(String(url)));
    const start = new Date(urls[0].searchParams.get("startsAt") ?? "");
    const end = new Date(urls[0].searchParams.get("endsAt") ?? "");
    const expectedStart = new Date(end); expectedStart.setHours(0, 0, 0, 0); expectedStart.setDate(expectedStart.getDate() - (preset === "7days" ? 6 : 29));
    expect(start.toISOString()).toBe(expectedStart.toISOString());
    for (const url of urls) {
      expect(url.searchParams.get("startsAt")).toBe(urls[0].searchParams.get("startsAt"));
      expect(url.searchParams.get("endsAt")).toBe(urls[0].searchParams.get("endsAt"));
      expect(url.searchParams.get("limit")).toBe(url.pathname.endsWith("sales-summary") ? null : "5");
    }
  });

  it("validates custom dates without querying until a valid range is applied", async () => {
    const { requests } = fixture();
    await screen.findByText("Margherita");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Período" }), "custom");
    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-09-10" } });
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-09-02" } });
    await userEvent.click(screen.getByRole("button", { name: "Aplicar período" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(requests()).toHaveLength(4);
    fireEvent.change(screen.getByLabelText("De"), { target: { value: "2026-09-01" } });
    await userEvent.click(screen.getByRole("button", { name: "Aplicar período" }));
    await waitFor(() => expect(requests()).toHaveLength(8));
    const expected = customPeriod("2026-09-01", "2026-09-02");
    for (const [url] of requests().slice(4)) {
      expect(new URL(String(url)).searchParams.get("startsAt")).toBe(expected.startsAt);
      expect(new URL(String(url)).searchParams.get("endsAt")).toBe(expected.endsAt);
    }
  });

  it("preserves the ordering and distinct name snapshots of products returned by the backend", async () => {
    fixture({ "top-products": () => Response.json([{ ...products[0], productName: "Nome antigo" }, { ...products[0], productName: "Nome atual" }]) });
    await screen.findByText("Nome antigo");
    const rows = within(section("Principais produtos")).getAllByRole("listitem");
    expect(rows[0].textContent).toContain("Nome antigo");
    expect(rows[1].textContent).toContain("Nome atual");
  });
});
