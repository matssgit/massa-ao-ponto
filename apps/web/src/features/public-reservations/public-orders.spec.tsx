import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../app/app";
import { ApiClient } from "../../lib/api-client";
import { AuthService } from "../auth/auth-service";

const token = "o".repeat(43);
const restaurant = { name: "Casa do Forno", slug: "casa-do-forno", address: "Rua das Oliveiras, 42", phone: "11987654321", timezone: "America/Sao_Paulo" };
const catalog = { categories: [{ id: "22222222-2222-4222-8222-222222222222", name: "Pizzas", displayOrder: 1, products: [{ id: "33333333-3333-4333-8333-333333333333", categoryId: "22222222-2222-4222-8222-222222222222", name: "Margherita", description: "Molho, queijo e manjericão", price: 4000, displayOrder: 1, addons: [{ id: "44444444-4444-4444-8444-444444444444", name: "Borda recheada", description: "Catupiry", price: 700 }] }] }] };
const details = {
  order: { status: "PENDING", type: "PICKUP", subtotal: 8700, deliveryFee: 0, total: 8700, paymentStatus: "PENDING", createdAt: "2030-09-10T22:00:00.000Z" },
  items: [{ productName: "Margherita", unitPrice: 4000, quantity: 2, subtotal: 8000, addons: [{ addonName: "Borda recheada", unitPrice: 700, quantity: 1, subtotal: 700 }] }],
};
type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response> | undefined;
function Location() { return <div data-testid="location">{useLocation().pathname}</div>; }
function fixture(path = "/r/casa-do-forno/pedido", handler?: Handler) {
  let cancelled = false;
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    const custom = handler?.(url, init);
    if (custom) return custom;
    if (url.pathname.endsWith("/catalog")) return Response.json(catalog);
    if (url.pathname === "/public/restaurants/casa-do-forno") return Response.json(restaurant);
    if (url.pathname === "/public/restaurants/casa-do-forno/orders" && init?.method === "POST") return Response.json({ ...details, accessToken: token });
    if (url.pathname === `/public/orders/${token}/cancel`) { cancelled = true; return Response.json({ ...details, order: { ...details.order, status: "CANCELLED" } }); }
    if (url.pathname === `/public/orders/${token}`) return Response.json({ ...details, order: { ...details.order, status: cancelled ? "CANCELLED" : "PENDING" } });
    throw new Error("Unexpected request");
  });
  render(<MemoryRouter initialEntries={[path]}><App service={new AuthService(new ApiClient("https://api.example.com", transport))} /><Location /></MemoryRouter>);
  return transport;
}
async function selectOrder() {
  await userEvent.click(await screen.findByRole("button", { name: "Adicionar Margherita" }));
  await userEvent.click(screen.getByRole("button", { name: "Aumentar Margherita" }));
  await userEvent.click(screen.getByRole("button", { name: "Aumentar Borda recheada" }));
}
async function reachReview() {
  await selectOrder();
  await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
  await userEvent.type(screen.getByLabelText("Nome"), "Maria Silva");
  await userEvent.type(screen.getByLabelText("Telefone com DDD"), "(11) 98765-4321");
  await userEvent.type(screen.getByLabelText("Observação (opcional)"), "Sem cortar");
  await userEvent.click(screen.getByRole("button", { name: "Revisar pedido" }));
}
const error = (status: number, code: string, message = "Mensagem pública") => Response.json({ code, message }, { status });

describe("Public pickup order UI", () => {
  it("uses the public catalog for an in-memory cart and keeps the estimate as cents-derived UX", async () => {
    fixture();
    expect(await screen.findByRole("heading", { name: "Monte seu pedido" })).toBeTruthy();
    expect(screen.getByText("Seu carrinho está vazio.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continuar" }).hasAttribute("disabled")).toBe(true);
    await selectOrder();
    expect(screen.getByLabelText("Quantidade de Margherita").textContent).toBe("2");
    expect(screen.getByLabelText("Quantidade de Borda recheada").textContent).toBe("1");
    expect(screen.getAllByText(/87,00/).some(node => node.textContent?.includes("R$"))).toBe(true);
    expect(screen.getByText(/valor final é calculado pelo restaurante no servidor/i)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(screen.getByText("Seu carrinho está vazio.")).toBeTruthy();
  });

  it("validates customer data, reviews PICKUP and sends only ids and quantities once", async () => {
    const storage = vi.spyOn(Storage.prototype, "setItem");
    let resolve: ((response: Response) => void) | undefined;
    const pending = new Promise<Response>(done => { resolve = done; });
    const transport = fixture(undefined, (url, init) => url.pathname.endsWith("/orders") && init?.method === "POST" ? pending : undefined);
    await userEvent.click(await screen.findByRole("button", { name: "Adicionar Margherita" }));
    await userEvent.click(screen.getByRole("button", { name: "Aumentar Borda recheada" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.click(screen.getByRole("button", { name: "Revisar pedido" }));
    expect(screen.getByLabelText(/^Nome/).getAttribute("aria-invalid")).toBe("true");
    await userEvent.type(screen.getByLabelText(/^Nome/), "Maria Silva");
    await userEvent.type(screen.getByLabelText(/^Telefone com DDD/), "11987654321");
    await userEvent.click(screen.getByRole("button", { name: "Revisar pedido" }));
    expect(screen.getByText("Retirada no local")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Editar dados" }));
    await userEvent.type(screen.getByLabelText("Observação (opcional)"), "Sem cortar");
    await userEvent.click(screen.getByRole("button", { name: "Revisar pedido" }));
    const confirm = screen.getByRole("button", { name: "Confirmar pedido" });
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(transport.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    const body = JSON.parse(String(transport.mock.calls.find(([, init]) => init?.method === "POST")?.[1]?.body)) as Record<string, unknown>;
    expect(body).toEqual({ type: "PICKUP", customer: { name: "Maria Silva", phone: "11987654321" }, items: [{ productId: catalog.categories[0].products[0].id, quantity: 1, addons: [{ addonId: catalog.categories[0].products[0].addons[0].id, quantity: 1 }] }], observation: "Sem cortar" });
    expect(JSON.stringify(body)).not.toMatch(/price|subtotal|total|customerId/i);
    resolve?.(Response.json({ ...details, accessToken: token }));
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe(`/pedido/${token}`));
    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  });

  it("does not retry an uncertain create result or enable duplicate submission", async () => {
    const transport = fixture(undefined, (url, init) => {
      if (url.pathname.endsWith("/orders") && init?.method === "POST") throw new Error("connection lost");
      return undefined;
    });
    await reachReview();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
    expect((await screen.findByRole("alert")).textContent).toContain("pode ter sido criado");
    expect(screen.getByRole("button", { name: "Confirmar pedido" }).hasAttribute("disabled")).toBe(true);
    expect(transport.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("loads snapshots, confirmed totals and refreshes the current token manually", async () => {
    let lookupCount = 0;
    let resolve: ((response: Response) => void) | undefined;
    const pending = new Promise<Response>(done => { resolve = done; });
    const transport = fixture(`/pedido/${token}`, url => {
      if (url.pathname !== `/public/orders/${token}`) return undefined;
      lookupCount += 1;
      return lookupCount === 2 ? pending : Response.json(details);
    });
    expect(await screen.findByRole("heading", { name: "Seu pedido" })).toBeTruthy();
    expect(screen.getAllByText("Pedido recebido")).toHaveLength(2);
    const progress = screen.getByRole("list", { name: "Progresso do pedido" });
    expect(progress.querySelector('[aria-current="step"]')?.textContent).toContain("Pedido recebido");
    expect(screen.getAllByText(/87,00/).some(node => node.textContent?.includes("R$"))).toBe(true);
    expect(screen.getByText(/2× Margherita/)).toBeTruthy();
    expect(screen.getByText(/1× Borda recheada/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Atualizar pedido" }));
    expect(screen.getByText(/2× Margherita/)).toBeTruthy();
    const updating = screen.getByRole("button", { name: "Atualizando pedido…" });
    expect(updating.hasAttribute("disabled")).toBe(true);
    fireEvent.click(updating);
    expect(transport.mock.calls.filter(([input]) => new URL(String(input)).pathname === `/public/orders/${token}`)).toHaveLength(2);
    resolve?.(Response.json(details));
    expect(await screen.findByText("Pedido atualizado.")).toBeTruthy();
    expect(screen.getByText(/Última consulta:/)).toBeTruthy();
  });

  it.each([
    ["PREPARING", "Em preparo"],
    ["READY", "Pronto para retirada"],
    ["CANCELLED", "Pedido cancelado"],
  ] as const)("presents %s with customer-facing pickup language", async (status, label) => {
    fixture(`/pedido/${token}`, url => url.pathname === `/public/orders/${token}` ? Response.json({ ...details, order: { ...details.order, status } }) : undefined);
    await screen.findByRole("heading", { name: "Seu pedido" });
    if (status === "CANCELLED") {
      expect(screen.getByRole("status", { name: "Pedido cancelado" })).toBeTruthy();
      expect(screen.queryByRole("list", { name: "Progresso do pedido" })).toBeNull();
    } else {
      const progress = screen.getByRole("list", { name: "Progresso do pedido" });
      expect(progress.querySelector('[aria-current="step"]')?.textContent).toContain(label);
    }
    expect(document.body.textContent).not.toContain("Saiu para entrega");
  });

  it("confirms cancellation accessibly, reloads details and keeps the token", async () => {
    const transport = fixture(`/pedido/${token}`);
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar pedido" }));
    const dialog = screen.getByRole("alertdialog");
    expect(document.activeElement).toBe(dialog);
    await userEvent.click(within(dialog).getByRole("button", { name: "Sim, cancelar pedido" }));
    expect(await screen.findByText("Cancelado")).toBeTruthy();
    expect(screen.getByText(/mesmo link continua disponível/)).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe(`/pedido/${token}`);
    expect(transport.mock.calls.filter(([input]) => String(input).endsWith(`/public/orders/${token}`))).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Cancelar pedido" })).toBeNull();
  });

  it("preserves lifecycle errors returned by cancellation", async () => {
    const first = fixture(`/pedido/${token}`, url => url.pathname.endsWith("/cancel") ? error(409, "INVALID_ORDER_STATUS_TRANSITION", "Estado não permite cancelamento") : undefined);
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar pedido" }));
    await userEvent.click(screen.getByRole("button", { name: "Sim, cancelar pedido" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Estado não permite cancelamento");
    expect(first.mock.calls.filter(([input]) => String(input).endsWith(`/public/orders/${token}`)).length).toBeGreaterThan(1);
  });

  it("shows paid state without offering cancellation", async () => {
    fixture(`/pedido/${token}`, url => url.pathname === `/public/orders/${token}` ? Response.json({ ...details, order: { ...details.order, paymentStatus: "PAID" } }) : undefined);
    expect(await screen.findByText("Pago")).toBeTruthy();
    expect(screen.getAllByText("Pedido recebido")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Cancelar pedido" })).toBeNull();
  });

  it("uses a generic invalid-token state and exposes Retry-After without automatic retry", async () => {
    fixture("/pedido/token-invalido");
    expect(await screen.findByRole("heading", { name: "Pedido não encontrado ou link inválido." })).toBeTruthy();
    const transport = fixture(`/pedido/${token}`, () => Response.json({ code: "PUBLIC_RATE_LIMIT", message: "Too many" }, { status: 429, headers: { "Retry-After": "75" } }));
    expect((await screen.findAllByRole("alert")).some(node => node.textContent?.includes("75 segundos"))).toBe(true);
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(1));
  });

  it("shows public not-found and empty-catalog states without admin authentication", async () => {
    fixture("/r/indisponivel/pedido", url => url.pathname.includes("indisponivel") ? error(404, "RESTAURANT_NOT_FOUND") : undefined);
    expect(await screen.findByRole("heading", { name: "Não encontramos este restaurante." })).toBeTruthy();
    fixture(undefined, url => url.pathname.endsWith("/catalog") ? Response.json({ categories: [] }) : undefined);
    expect(await screen.findByText("Seu carrinho está vazio.")).toBeTruthy();
    expect(screen.queryByText(/Painel/i)).toBeNull();
  });
});
