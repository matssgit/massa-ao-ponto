import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { App } from "../../app/app";
import { ApiClient } from "../../lib/api-client";
import { AuthService, type Membership } from "../auth/auth-service";
import { customPeriod } from "../dashboard/period";
import { orderStatusSchema, type OrderDetail } from "./orders-service";
import { createdAt, deliveryDetail, deliveryId, orderDetail, orderId, restaurantA, restaurantB } from "./orders.test-data";

type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>;
function page(detail: OrderDetail, pageNumber = 1, total = 1, limit = 20) {
  return { data: total === 0 ? [] : [{ order: detail.order, items: detail.items }], meta: { page: pageNumber, limit, total, totalPages: Math.ceil(total / limit), hasNext: pageNumber < Math.ceil(total / limit), hasPrevious: pageNumber > 1 } };
}
function fixture(options: { detail?: OrderDetail; memberships?: Membership[]; list?: Handler; get?: Handler; mutation?: Handler } = {}) {
  let detail = options.detail ?? orderDetail();
  const memberships = options.memberships ?? [{ restaurantId: restaurantA, role: "OWNER" }];
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/session") return Response.json({ user: { id: restaurantA, email: "owner@example.com" }, csrfToken: "orders-csrf", memberships });
    if (url.pathname === "/restaurants") return Response.json([{ id: restaurantA, name: "Centro" }, { id: restaurantB, name: "Norte" }]);
    if (url.pathname.endsWith("/orders")) return options.list?.(url, init) ?? Response.json(page(detail));
    if (init?.method === "GET") return options.get?.(url, init) ?? Response.json(detail);
    if (options.mutation) return options.mutation(url, init);
    if (url.pathname.endsWith("/status")) {
      const body: unknown = JSON.parse(String(init?.body));
      const { status } = z.object({ status: orderStatusSchema }).parse(body);
      detail = { ...detail, order: { ...detail.order, status } };
      return new Response(null, { status: 204 });
    }
    if (url.pathname.endsWith("/payment")) {
      detail = { ...detail, order: { ...detail.order, paymentStatus: "PAID" } };
      return Response.json(detail.order);
    }
    if (url.pathname.endsWith("/cancel")) {
      detail = { ...detail, order: { ...detail.order, status: "CANCELLED" } };
      return Response.json({ status: "CANCELLED" });
    }
    if (url.pathname.endsWith("/delivery")) {
      const delivery = { id: deliveryId, orderId, status: "PENDING" as const, createdAt, updatedAt: createdAt };
      detail = { ...detail, delivery: { ...delivery, history: [{ id: deliveryId, action: "DELIVERY_CREATED", previousStatus: "PENDING", newStatus: "PENDING", observation: null, createdAt }] } };
      return Response.json(delivery, { status: 201 });
    }
    if (detail.delivery && (url.pathname.endsWith("/start") || url.pathname.endsWith("/complete"))) {
      const status = url.pathname.endsWith("/start") ? "OUT_FOR_DELIVERY" : "DELIVERED";
      detail = { ...detail, order: { ...detail.order, status }, delivery: { ...detail.delivery, status } };
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  });
  render(<MemoryRouter initialEntries={["/pedidos"]}><App service={new AuthService(new ApiClient("https://api.example.com", transport))} /></MemoryRouter>);
  const requests = () => transport.mock.calls.filter(([url]) => String(url).includes("/orders"));
  const writes = () => requests().filter(([, init]) => init?.method !== "GET");
  return { transport, requests, writes };
}
async function open() {
  await userEvent.click(await screen.findByRole("button", { name: /Abrir pedido/ }));
  await screen.findByRole("region", { name: "Resumo do pedido" });
}
const summary = () => within(screen.getByRole("region", { name: "Resumo do pedido" }));

describe("Orders UI", () => {
  it("shows loading without treating it as empty", async () => {
    fixture({ list: () => new Promise<Response>(() => {}) });
    expect(await screen.findByText("Carregando pedidos…")).toBeTruthy();
    expect(screen.queryByText(/Nenhum pedido nesta página/)).toBeNull();
  });

  it("renders empty results and metadata", async () => {
    fixture({ list: () => Response.json(page(orderDetail(), 1, 0)) });
    await screen.findByText(/Nenhum pedido nesta página/);
    expect(screen.getByText("0 pedidos encontrados · Mais recentes primeiro")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Próxima" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows API errors and retries the list", async () => {
    let fail = true;
    const { requests } = fixture({ list: () => fail ? Response.json({ code: "FORBIDDEN", message: "Acesso indisponível" }, { status: 403 }) : Response.json(page(orderDetail())) });
    expect((await screen.findByRole("alert")).textContent).toBe("Acesso indisponível");
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar carregar pedidos novamente" }));
    await screen.findByRole("button", { name: /Abrir pedido/ });
    expect(requests()).toHaveLength(2);
  });

  it("rejects a malformed list instead of displaying fictional zeros", async () => {
    fixture({ list: () => Response.json({ data: [], meta: {} }) });
    await screen.findByRole("alert");
    expect(screen.queryByText(/0 pedidos encontrados/)).toBeNull();
  });

  it("displays snapshot customer, type, status, payment, cents and timestamp", async () => {
    const { requests } = fixture();
    const table = within(await screen.findByRole("table", { name: "Pedidos do restaurante" }));
    for (const text of ["Ana Silva", "Retirada", "Pendente", "A pagar"]) expect(table.getByText(text)).toBeTruthy();
    expect(table.getByText(/55,00/)).toBeTruthy();
    expect(table.getByText(/03\/09\/2026/)).toBeTruthy();
    const url = new URL(String(requests()[0][0]));
    expect(url.pathname).toBe(`/restaurants/${restaurantA}/orders`);
    expect(Object.fromEntries(url.searchParams)).toEqual({ page: "1", limit: "20" });
    expect(requests()[0][1]?.credentials).toBe("include");
  });

  it("uses server pagination metadata and resets page when applying filters", async () => {
    const { requests } = fixture({ list: (url) => Response.json(page(orderDetail(), Number(url.searchParams.get("page")), 42, Number(url.searchParams.get("limit")))) });
    await screen.findByText("Página 1 de 3 · 20 por página");
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 2 de 3 · 20 por página");
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 3 de 3 · 20 por página");
    expect(screen.getByRole("button", { name: "Próxima" }).hasAttribute("disabled")).toBe(true);
    await userEvent.selectOptions(screen.getByLabelText("Status"), "READY");
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "DINE_IN");
    await userEvent.selectOptions(screen.getByLabelText("Por página"), "100");
    fireEvent.change(screen.getByLabelText("Criados de"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-09-03" } });
    await userEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await screen.findByText("Página 1 de 1 · 100 por página");
    expect(Object.fromEntries(new URL(String(requests().at(-1)?.[0])).searchParams)).toEqual({ page: "1", limit: "100", status: "READY", type: "DINE_IN", ...customPeriod("2026-09-01", "2026-09-03") });
    await userEvent.click(screen.getByRole("button", { name: "Limpar" }));
    await screen.findByText("Página 1 de 3 · 20 por página");
    expect(Object.fromEntries(new URL(String(requests().at(-1)?.[0])).searchParams)).toEqual({ page: "1", limit: "20" });
  });

  it("does not send incomplete or reversed periods", async () => {
    const { requests } = fixture();
    await screen.findByRole("table");
    fireEvent.change(screen.getByLabelText("Criados de"), { target: { value: "2026-09-03" } });
    await userEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await screen.findByRole("alert");
    expect(requests()).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-09-01" } });
    await userEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    expect(requests()).toHaveLength(1);
  });

  it("loads detail, snapshot addons, observation and ordered history", async () => {
    const detail = orderDetail();
    detail.items[0].addons = [{ id: deliveryId, addonId: deliveryId, addonName: "Borda antiga", unitPrice: 500, quantity: 1, subtotal: 500, createdAt }];
    detail.history.push({ id: restaurantB, action: "STATUS_CHANGED", previousStatus: "PENDING", newStatus: "CONFIRMED", observation: "Operação", createdAt });
    fixture({ detail });
    await open();
    expect(screen.getByText("1 × Margherita histórica")).toBeTruthy();
    expect(screen.getByText(/1 × Borda antiga/)).toBeTruthy();
    expect(screen.getByText("Observação: Sem cebola")).toBeTruthy();
    expect(summary().getAllByText(/55,00/)).toHaveLength(2);
    const entries = within(screen.getByRole("region", { name: "Histórico do pedido" })).getAllByRole("listitem");
    expect(entries[0].textContent).toContain("Pedido criado");
    expect(entries[1].textContent).toContain("Pendente → Confirmado");
    expect(screen.queryByRole("region", { name: "Entrega" })).toBeNull();
  });

  it.each([false, true])("handles empty addons, omitted=%s", async (omitted) => {
    fixture({ get: () => {
      const detail = orderDetail();
      const { addons, ...item } = detail.items[0];
      return Response.json({ ...detail, items: [omitted ? item : { ...item, addons }] });
    } });
    await open();
    expect(screen.getByText("Sem adicionais.")).toBeTruthy();
  });

  it("handles detail loading and not-found retry without showing actions", async () => {
    let resolve: (response: Response) => void = () => {};
    let fail = true;
    fixture({ get: () => fail ? new Promise<Response>((done) => { resolve = done; }) : Response.json(orderDetail()) });
    await userEvent.click(await screen.findByRole("button", { name: /Abrir pedido/ }));
    await screen.findByText("Carregando detalhe do pedido…");
    expect(screen.queryByRole("button", { name: "Confirmar pedido" })).toBeNull();
    await act(async () => resolve(Response.json({ code: "ORDER_NOT_FOUND", message: "Pedido não encontrado" }, { status: 404 })));
    await screen.findByRole("alert");
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar carregar detalhe novamente" }));
    await screen.findByRole("button", { name: "Confirmar pedido" });
  });

  it("STAFF changes status with CSRF and reloads detail and list", async () => {
    const { requests, writes } = fixture({ memberships: [{ restaurantId: restaurantA, role: "STAFF" }] });
    await open();
    expect(screen.queryByRole("button", { name: "Registrar pagamento" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
    await screen.findByRole("button", { name: "Iniciar preparo" });
    expect(writes()).toHaveLength(1);
    expect(String(writes()[0][0])).toBe(`https://api.example.com/restaurants/${restaurantA}/orders/${orderId}/status`);
    expect(writes()[0][1]?.method).toBe("PATCH");
    expect(writes()[0][1]?.body).toBe(JSON.stringify({ status: "CONFIRMED" }));
    expect(new Headers(writes()[0][1]?.headers).get("X-CSRF-Token")).toBe("orders-csrf");
    expect(new Headers(writes()[0][1]?.headers).get("X-Auth-Request")).toBe("1");
    expect(requests().filter(([, init]) => init?.method === "GET")).toHaveLength(4);
    await userEvent.click(screen.getByRole("button", { name: "Voltar aos pedidos" }));
    expect(within(screen.getByRole("table")).getByText("Confirmado")).toBeTruthy();
  });

  it("OWNER confirms payment explicitly and loses the cancel action after reload", async () => {
    const { writes } = fixture();
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Registrar pagamento" }));
    expect(writes()).toHaveLength(0);
    const confirm = screen.getByRole("button", { name: "Confirmar pagamento" }); expect(document.activeElement).toBe(confirm);
    await userEvent.click(confirm);
    await waitFor(() => expect(summary().getByText("Pago")).toBeTruthy());
    expect(String(writes()[0][0])).toContain("/payment");
    expect(screen.queryByRole("button", { name: "Cancelar pedido" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Registrar pagamento" })).toBeNull();
  });

  it("allows cancelling confirmation without writing, then cancels through the dedicated endpoint", async () => {
    const { writes } = fixture();
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));
    await userEvent.click(screen.getByRole("button", { name: "Voltar sem confirmar" }));
    expect(writes()).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    await waitFor(() => expect(summary().getByText("Cancelado")).toBeTruthy());
    expect(String(writes()[0][0])).toContain("/cancel");
    expect(writes()[0][1]?.body).toBeUndefined();
    expect(screen.getByText("Nenhuma ação disponível no estado atual.")).toBeTruthy();
  });

  it("shows domain conflicts and reloads authoritative state without automatic mutation retry", async () => {
    const { writes } = fixture({ mutation: () => Response.json({ code: "INVALID_ORDER_STATUS_TRANSITION", message: "O estado do pedido mudou." }, { status: 409 }) });
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
    await screen.findByText(/O estado do pedido mudou/);
    await screen.findByRole("button", { name: "Confirmar pedido" });
    expect(writes()).toHaveLength(1);
    expect(summary().getByText("Pendente")).toBeTruthy();
  });

  it("keeps uncertain writes explicit and prevents duplicate clicks while pending", async () => {
    let reject: (error: Error) => void = () => {};
    const { writes } = fixture({ mutation: () => new Promise<Response>((_, fail) => { reject = fail; }) });
    await open();
    const button = screen.getByRole("button", { name: "Confirmar pedido" });
    fireEvent.click(button); fireEvent.click(button);
    expect(writes()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Atualizar detalhe" }).hasAttribute("disabled")).toBe(true);
    await act(async () => reject(new TypeError("network")));
    await screen.findByText(/Não foi possível confirmar o resultado/);
    await screen.findByRole("button", { name: "Confirmar pedido" });
    expect(writes()).toHaveLength(1);
  });

  it("STAFF creates, starts and completes delivery via the existing contracts", async () => {
    const detail = deliveryDetail();
    detail.order.status = "READY";
    const { writes } = fixture({ detail, memberships: [{ restaurantId: restaurantA, role: "STAFF" }] });
    await open();
    expect(screen.getByText("Entrega ainda não criada.")).toBeTruthy();
    expect(screen.getByText(/Rua das Pizzas/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Concluir pedido" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Criar entrega" }));
    await screen.findByRole("button", { name: "Iniciar entrega" });
    expect(screen.getByRole("region", { name: "Histórico da entrega" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Iniciar entrega" }));
    await screen.findByRole("button", { name: "Concluir entrega" });
    await userEvent.click(screen.getByRole("button", { name: "Concluir entrega" }));
    await waitFor(() => expect(summary().getByText("Concluído")).toBeTruthy());
    expect(writes().map(([url, init]) => [new URL(String(url)).pathname.split(orderId)[1], init?.method])).toEqual([["/delivery", "POST"], ["/delivery/start", "PATCH"], ["/delivery/complete", "PATCH"]]);
  });

  it("ignores an old tenant response and clears detail/filters on restaurant change", async () => {
    let resolve: (response: Response) => void = () => {};
    const { requests } = fixture({
      memberships: [{ restaurantId: restaurantA, role: "OWNER" }, { restaurantId: restaurantB, role: "STAFF" }],
      get: () => new Promise<Response>((done) => { resolve = done; }),
      list: (url) => {
        const detail = orderDetail();
        detail.order.customerName = url.pathname.includes(restaurantB) ? "Bruno Norte" : "Ana Silva";
        return Response.json(page(detail));
      },
    });
    await screen.findByText("Qual casa vamos acompanhar?");
    expect(requests()).toHaveLength(0);
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantA);
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "PICKUP");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await userEvent.click(await screen.findByRole("button", { name: /Abrir pedido/ }));
    await screen.findByText("Carregando detalhe do pedido…");
    const old = requests().at(-1);
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantB);
    await screen.findByText("Bruno Norte");
    expect(old?.[1]?.signal?.aborted).toBe(true);
    await act(async () => resolve(Response.json(orderDetail())));
    expect(screen.queryByRole("region", { name: "Resumo do pedido" })).toBeNull();
    expect(screen.queryByText("Ana Silva")).toBeNull();
    expect(Object.fromEntries(new URL(String(requests().at(-1)?.[0])).searchParams)).toEqual({ page: "1", limit: "20" });
  });

  it("ignores a pending list response when filters change", async () => {
    let resolve: (response: Response) => void = () => {};
    const { requests } = fixture({ list: (url) => url.searchParams.has("status")
      ? Response.json(page(orderDetail(), 1, 0))
      : new Promise<Response>((done) => { resolve = done; }) });
    await screen.findByText("Carregando pedidos…");
    const old = requests()[0];
    await userEvent.selectOptions(screen.getByLabelText("Status"), "READY");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await screen.findByText(/Nenhum pedido nesta página/);
    expect(old[1]?.signal?.aborted).toBe(true);
    await act(async () => resolve(Response.json(page(orderDetail()))));
    expect(screen.queryByRole("button", { name: /Abrir pedido/ })).toBeNull();
  });

  it("does not reuse stale actions if reloading after a successful mutation fails", async () => {
    let changed = false;
    fixture({
      get: () => changed ? Response.json({ code: "INTERNAL_ERROR", message: "Consulta indisponível" }, { status: 500 }) : Response.json(orderDetail()),
      mutation: () => { changed = true; return new Response(null, { status: 204 }); },
    });
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
    await screen.findByText("Consulta indisponível");
    expect(screen.queryByRole("button", { name: "Confirmar pedido" })).toBeNull();
    expect(screen.getByRole("button", { name: "Tentar carregar detalhe novamente" })).toBeTruthy();
  });

  it("does not apply a completed old-tenant mutation to the newly selected restaurant", async () => {
    let resolve: (response: Response) => void = () => {};
    const { requests, writes } = fixture({
      memberships: [{ restaurantId: restaurantA, role: "OWNER" }, { restaurantId: restaurantB, role: "STAFF" }],
      mutation: () => new Promise<Response>((done) => { resolve = done; }),
    });
    await screen.findByText("Qual casa vamos acompanhar?");
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantA);
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
    await screen.findByText("Enviando ação…");
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantB);
    await screen.findByRole("table");
    const count = requests().length;
    await act(async () => resolve(new Response(null, { status: 204 })));
    expect(requests()).toHaveLength(count);
    expect(writes()).toHaveLength(1);
    expect(String(writes()[0][0])).toContain(`/restaurants/${restaurantA}/`);
    expect(screen.queryByText(/Ação concluída/)).toBeNull();
  });
});
