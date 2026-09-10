import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../app/app";
import { AuthService } from "../auth/auth-service";
import { ApiClient } from "../../lib/api-client";

const token = "a".repeat(43);
const restaurant = { name: "Casa do Forno", slug: "casa-do-forno", address: "Rua das Oliveiras, 42", phone: "11987654321", timezone: "America/Sao_Paulo", deliveryEnabled: false, deliveryFeeCents: 0 };
const table = { id: "11111111-1111-4111-8111-111111111111", number: "7", capacity: 4, type: "table" };
const details = { restaurant, table: { number: "7", capacity: 4, type: "table" }, reservation: { status: "SCHEDULED", partySize: 2, startsAt: "2030-09-10T22:00:00.000Z", endsAt: "2030-09-11T00:00:00.000Z", notes: null } };
const catalog = { categories: [{ id: "22222222-2222-4222-8222-222222222222", name: "Pizzas", displayOrder: 1, products: [{ id: "33333333-3333-4333-8333-333333333333", categoryId: "22222222-2222-4222-8222-222222222222", name: "Margherita", description: "Molho, queijo e manjericão", price: 4590, displayOrder: 1, addons: [{ id: "44444444-4444-4444-8444-444444444444", name: "Borda recheada", description: "Catupiry", price: 800 }] }] }] };
type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response> | undefined;
function Location() { return <div data-testid="location">{useLocation().pathname}</div>; }
function fixture(path = "/r/casa-do-forno", handler?: Handler) {
  let cancelled = false;
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input)); const custom = handler?.(url, init); if (custom) return custom;
    if (url.pathname.endsWith("/availability")) return Response.json([table]);
    if (url.pathname.endsWith("/catalog")) return Response.json(catalog);
    if (url.pathname === "/public/restaurants/casa-do-forno") return Response.json(restaurant);
    if (url.pathname === "/public/restaurants/casa-do-forno/reservations") return Response.json({ ...details, accessToken: token });
    if (url.pathname.endsWith("/cancel")) cancelled = true;
    if (url.pathname.startsWith("/public/reservations/")) return Response.json({ ...details, reservation: { ...details.reservation, status: cancelled ? "CANCELLED" : "SCHEDULED" } });
    throw new Error("Unexpected request");
  });
  render(<MemoryRouter initialEntries={[path]}><App service={new AuthService(new ApiClient("https://api.example.com", transport))} /><Location /></MemoryRouter>);
  return transport;
}
async function availability() {
  await screen.findByLabelText("Pessoas");
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2030-09-10T19:00" } });
  fireEvent.change(screen.getByLabelText("Término"), { target: { value: "2030-09-10T21:00" } });
  await userEvent.click(screen.getByRole("button", { name: "Ver mesas disponíveis" }));
}
async function customer() {
  await userEvent.click(await screen.findByRole("radio", { name: /Mesa 7/ }));
  await userEvent.type(screen.getByLabelText("Nome"), "Maria Silva");
  await userEvent.type(screen.getByLabelText("Telefone com DDD"), "(11) 98765-4321");
}
const error = (status: number, code: string, message = "Mensagem sanitizada") => Response.json({ code, message }, { status });

describe("Public reservation UI", () => {
  it("shows public Restaurant and navigates to booking without auth or admin shell", async () => {
    const transport = fixture();
    expect(await screen.findByRole("heading", { name: "Casa do Forno" })).toBeTruthy();
    expect(screen.getByText(restaurant.address)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver cardápio" }).getAttribute("href")).toBe("/r/casa-do-forno/cardapio");
    expect(screen.getByRole("link", { name: "Pedir para retirada" }).getAttribute("href")).toBe("/r/casa-do-forno/pedido");
    await userEvent.click(screen.getByRole("link", { name: /Reservar mesa/ }));
    expect(await screen.findByRole("heading", { name: "Uma mesa para vocês." })).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(transport.mock.calls.every(([input]) => new URL(String(input)).pathname.startsWith("/public/"))).toBe(true);
  });
  it("shows a public 404 for missing/unpublished Restaurant", async () => {
    fixture(undefined, () => error(404, "RESTAURANT_NOT_FOUND"));
    expect(await screen.findByRole("heading", { name: "Não encontramos este restaurante." })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Reservar mesa/ })).toBeNull();
  });
  it("shows Restaurant network error and allows retry", async () => {
    let fail = true; fixture(undefined, () => fail ? error(503, "UNAVAILABLE") : undefined);
    expect(await screen.findByRole("alert")).toBeTruthy(); fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("heading", { name: "Casa do Forno" })).toBeTruthy();
  });
  it("loads the public catalog without auth and renders categories, products, BRL prices and addons", async () => {
    let resolve: ((response: Response) => void) | undefined;
    const pending = new Promise<Response>(done => { resolve = done; });
    const transport = fixture("/r/casa-do-forno/cardapio", url => url.pathname.endsWith("/catalog") ? pending : undefined);
    expect(screen.getByRole("status").textContent).toContain("Preparando o cardápio");
    resolve?.(Response.json(catalog));
    expect(await screen.findByRole("heading", { name: "Cardápio" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Pizzas" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Margherita" })).toBeTruthy();
    expect(screen.getByText(/45,90/).textContent).toContain("R$");
    expect(screen.getByText(/Borda recheada/).textContent).toContain("Catupiry");
    expect(screen.getByText(/8,00/).textContent).toContain("+");
    expect(screen.getByRole("link", { name: "Fazer pedido para retirada" }).getAttribute("href")).toBe("/r/casa-do-forno/pedido");
    expect(transport.mock.calls.every(([input]) => new URL(String(input)).pathname.startsWith("/public/"))).toBe(true);
  });
  it("shows an accessible empty public catalog", async () => {
    fixture("/r/casa-do-forno/cardapio", url => url.pathname.endsWith("/catalog") ? Response.json({ categories: [] }) : undefined);
    expect(await screen.findByRole("heading", { name: "Cardápio em preparação." })).toBeTruthy();
  });
  it("preserves catalog errors and allows retry", async () => {
    let fail = true;
    fixture("/r/casa-do-forno/cardapio", url => url.pathname.endsWith("/catalog") && fail ? error(503, "UNAVAILABLE") : undefined);
    expect(await screen.findByRole("alert")).toBeTruthy();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("heading", { name: "Margherita" })).toBeTruthy();
  });
  it("uses the same generic public state for a missing or unpublished catalog", async () => {
    fixture("/r/indisponivel/cardapio", url => url.pathname.endsWith("/catalog") ? error(404, "RESTAURANT_NOT_FOUND") : undefined);
    expect(await screen.findByRole("heading", { name: "Não encontramos este restaurante." })).toBeTruthy();
  });
  it("shows availability loading/success and submits the selected period and partySize", async () => {
    let resolve: ((response: Response) => void) | undefined;
    const pending = new Promise<Response>(done => { resolve = done; });
    const transport = fixture("/r/casa-do-forno/reservar", url => url.pathname.endsWith("availability") ? pending : undefined);
    await availability(); expect(screen.getByRole("status").textContent).toContain("Consultando disponibilidade");
    resolve?.(Response.json([table]));
    expect(await screen.findByRole("radio", { name: /Mesa 7/ })).toBeTruthy();
    const url = new URL(String(transport.mock.calls.find(([input]) => String(input).includes("availability"))?.[0]));
    expect(url.searchParams.get("partySize")).toBe("2"); expect(url.searchParams.get("startsAt")).toBe("2030-09-10T22:00:00.000Z");
    fireEvent.change(screen.getByLabelText("Pessoas"), { target: { value: "3" } });
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByText(/não há duração automática/)).toBeTruthy();
  });
  it("shows empty availability without inventing a table", async () => {
    fixture("/r/casa-do-forno/reservar", url => url.pathname.endsWith("availability") ? Response.json([]) : undefined);
    await availability(); expect(await screen.findByText(/Nenhuma mesa disponível/)).toBeTruthy(); expect(screen.queryByRole("radio")).toBeNull();
  });
  it("preserves availability errors and offers manual retry", async () => {
    let fail = true; fixture("/r/casa-do-forno/reservar", url => url.pathname.endsWith("availability") && fail ? error(503, "UNAVAILABLE") : undefined);
    await availability(); expect(await screen.findByRole("alert")).toBeTruthy(); fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" })); expect(await screen.findByRole("radio")).toBeTruthy();
  });
  it("associates customer validation errors and accepts optional email", async () => {
    fixture("/r/casa-do-forno/reservar"); await availability(); await userEvent.click(await screen.findByRole("radio"));
    await userEvent.click(screen.getByRole("button", { name: "Revisar reserva" }));
    expect(screen.getByLabelText("Nome").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Nome").getAttribute("aria-describedby")).toBe("error-name");
    expect(document.activeElement?.getAttribute("role")).toBe("alert");
    await userEvent.type(screen.getByLabelText("Nome"), "Maria"); await userEvent.type(screen.getByLabelText("Telefone com DDD"), "11987654321");
    await userEvent.type(screen.getByLabelText("E-mail (opcional)"), "bad"); await userEvent.click(screen.getByRole("button", { name: "Revisar reserva" }));
    expect(screen.getByText("Informe um e-mail válido.")).toBeTruthy();
    await userEvent.clear(screen.getByLabelText("E-mail (opcional)")); await userEvent.click(screen.getByRole("button", { name: "Revisar reserva" }));
    expect(screen.getByRole("button", { name: "Confirmar reserva" })).toBeTruthy();
  });
  it("blocks duplicate create, navigates with token and never writes persistent storage", async () => {
    const storage = vi.spyOn(Storage.prototype, "setItem");
    let resolve: ((response: Response) => void) | undefined; const pending = new Promise<Response>(done => { resolve = done; });
    const transport = fixture("/r/casa-do-forno/reservar", (url, init) => url.pathname.endsWith("/reservations") && init?.method === "POST" ? pending : undefined);
    await availability(); await customer(); await userEvent.type(screen.getByLabelText("Observação (opcional)"), "Aniversário");
    await userEvent.click(screen.getByRole("button", { name: "Revisar reserva" }));
    const button = screen.getByRole("button", { name: "Confirmar reserva" }); fireEvent.click(button); fireEvent.click(button);
    expect(transport.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    const body = JSON.parse(String(transport.mock.calls.find(([, init]) => init?.method === "POST")?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ tableId: table.id, partySize: 2, customer: { name: "Maria Silva", phone: "(11) 98765-4321" }, notes: "Aniversário" });
    expect(body.customer).not.toHaveProperty("email"); expect(body).not.toHaveProperty("customerId");
    resolve?.(Response.json({ ...details, accessToken: token }));
    expect(await screen.findByRole("heading", { name: "Sua reserva" })).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe(`/reserva/${token}`); expect(storage).not.toHaveBeenCalled(); storage.mockRestore();
  });
  it("shows create conflicts and requires checking availability again", async () => {
    fixture("/r/casa-do-forno/reservar", (url, init) => url.pathname.endsWith("/reservations") && init?.method === "POST" ? error(409, "RESERVATION_CONFLICT", "Reservation conflict.") : undefined);
    await availability(); await customer(); await userEvent.click(screen.getByRole("button", { name: "Revisar reserva" })); await userEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByText("Reservation conflict.")).toBeTruthy(); expect(screen.queryByRole("radio")).toBeNull();
  });
  it("renders lookup with public status, table, dates and timezone", async () => {
    fixture(`/reserva/${token}`); expect(await screen.findByRole("heading", { name: "Sua reserva" })).toBeTruthy();
    expect(screen.getByText("Agendada")).toBeTruthy(); expect(screen.getByText("7 · até 4 pessoas")).toBeTruthy(); expect(screen.getByText("America/Sao_Paulo")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
  it.each(["not-a-token", token])("uses generic invalid-link state for %s", async value => {
    fixture(`/reserva/${value}`, () => error(404, "PUBLIC_RESERVATION_NOT_FOUND", "Internal reason"));
    expect(await screen.findByRole("heading", { name: "Reserva não encontrada ou link inválido." })).toBeTruthy(); expect(screen.queryByText("Internal reason")).toBeNull();
  });
  it("confirms cancellation accessibly then reloads using the same token", async () => {
    const transport = fixture(`/reserva/${token}`); await userEvent.click(await screen.findByRole("button", { name: "Cancelar reserva" }));
    const dialog = screen.getByRole("alertdialog"); expect(document.activeElement).toBe(dialog);
    await userEvent.click(within(dialog).getByRole("button", { name: "Manter reserva" })); expect(screen.queryByRole("alertdialog")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar reserva" })); await userEvent.click(screen.getByRole("button", { name: "Sim, cancelar reserva" }));
    expect(await screen.findByText("Cancelada")).toBeTruthy(); expect(screen.getByTestId("location").textContent).toBe(`/reserva/${token}`);
    expect(transport.mock.calls.filter(([input]) => String(input).endsWith(`/public/reservations/${token}`))).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Cancelar reserva" })).toBeNull();
  });
  it.each(["RESERVATION_CANCELLATION_WINDOW_EXPIRED", "INVALID_RESERVATION_STATUS_TRANSITION"])("preserves cancellation error %s and refreshes", async code => {
    fixture(`/reserva/${token}`, url => url.pathname.endsWith("cancel") ? error(409, code, "Regra do servidor") : undefined);
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar reserva" })); await userEvent.click(screen.getByRole("button", { name: "Sim, cancelar reserva" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Regra do servidor"); expect(await screen.findByText("Agendada")).toBeTruthy();
  });
  it("shows friendly 429 with Retry-After without automatic retries", async () => {
    const transport = fixture(`/reserva/${token}`, () => Response.json({ code: "PUBLIC_RATE_LIMIT", message: "Too many" }, { status: 429, headers: { "Retry-After": "75" } }));
    expect((await screen.findByRole("alert")).textContent).toContain("75 segundos");
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(1));
  });
  it("discards a stale availability response after changing the period", async () => {
    let resolve: ((response: Response) => void) | undefined;
    const pending = new Promise<Response>(done => { resolve = done; });
    fixture("/r/casa-do-forno/reservar", url => url.pathname.endsWith("availability") ? pending : undefined);
    await availability();
    fireEvent.change(screen.getByLabelText("Pessoas"), { target: { value: "4" } });
    resolve?.(Response.json([table]));
    await waitFor(() => expect(screen.queryByText("Consultando disponibilidade…")).toBeNull());
    expect(screen.queryByRole("radio")).toBeNull();
  });
  it("does not automatically retry a rate-limited creation", async () => {
    const transport = fixture("/r/casa-do-forno/reservar", (url, init) => url.pathname.endsWith("/reservations") && init?.method === "POST" ? Response.json({ code: "PUBLIC_RATE_LIMIT", message: "Too many" }, { status: 429, headers: { "Retry-After": "60" } }) : undefined);
    await availability(); await customer(); await userEvent.click(screen.getByRole("button", { name: "Revisar reserva" })); await userEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect((await screen.findByRole("alert")).textContent).toContain("60 segundos");
    expect(transport.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
  it("blocks a duplicate reservation after an uncertain create result", async () => {
    const transport = fixture("/r/casa-do-forno/reservar", (url, init) => {
      if (url.pathname.endsWith("/reservations") && init?.method === "POST") throw new Error("connection lost");
      return undefined;
    });
    await availability(); await customer(); await userEvent.click(screen.getByRole("button", { name: "Revisar reserva" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByText(/Para evitar duplicidade, não envie novamente/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirmar reserva" }).hasAttribute("disabled")).toBe(true);
    expect(transport.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
  it("traps confirmation focus and closes with Escape without cancelling", async () => {
    const transport = fixture("/reserva/" + token); await userEvent.click(await screen.findByRole("button", { name: "Cancelar reserva" }));
    await userEvent.tab({ shift: true }); expect(document.activeElement).toBe(screen.getByRole("button", { name: "Sim, cancelar reserva" }));
    await userEvent.tab(); expect(document.activeElement).toBe(screen.getByRole("button", { name: "Manter reserva" }));
    await userEvent.keyboard("{Escape}"); expect(screen.queryByRole("alertdialog")).toBeNull(); expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar reserva" }));
    expect(transport.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

});
