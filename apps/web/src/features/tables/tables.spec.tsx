import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../app/app";
import { ApiClient } from "../../lib/api-client";
import { AuthService, type Membership } from "../auth/auth-service";
import type { RestaurantTable } from "./tables-service";

const restaurantA = "11111111-1111-4111-8111-111111111111";
const restaurantB = "22222222-2222-4222-8222-222222222222";
const tableId = "33333333-3333-4333-8333-333333333333";
const timestamp = "2026-09-04T12:00:00.000Z";
const baseTable: RestaurantTable = { id: tableId, restaurantId: restaurantA, number: "10", capacity: 4, type: "table", active: true, createdAt: timestamp, updatedAt: timestamp };
type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response> | undefined;

function fixture(options: { memberships?: Membership[]; tables?: RestaurantTable[]; handler?: Handler } = {}) {
  let tables = options.tables ?? [baseTable];
  const memberships = options.memberships ?? [{ restaurantId: restaurantA, role: "OWNER" }];
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input)); const method = init?.method ?? "GET";
    if (url.pathname === "/auth/session") return Response.json({ user: { id: crypto.randomUUID(), email: "owner@example.com" }, csrfToken: "tables-csrf", memberships });
    if (url.pathname === "/restaurants") return Response.json([{ id: restaurantA, name: "Centro" }, { id: restaurantB, name: "Norte" }]);
    if (url.pathname.includes("/dashboard/")) return url.pathname.endsWith("sales-summary") ? Response.json({ period: { startsAt: null, endsAt: null }, orders: { total: 0, paid: 0, pending: 0, delivered: 0, cancelled: 0 }, revenue: 0, averageTicket: 0 }) : Response.json([]);
    const overridden = options.handler?.(url, init); if (overridden) return overridden;
    if (method === "GET" && url.pathname.endsWith("/tables")) return Response.json(tables.map((item) => ({ ...item, restaurantId: url.pathname.includes(restaurantB) ? restaurantB : restaurantA })));
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    if (method === "POST" && url.pathname.endsWith("/tables")) { const created = { ...baseTable, ...body, id: crypto.randomUUID() }; tables = [...tables, created]; return Response.json(created, { status: 201 }); }
    if (method === "PATCH" && url.pathname.endsWith(`/tables/${tableId}`)) { const updated = { ...baseTable, ...body }; tables = tables.map((item) => item.id === tableId ? updated : item); return Response.json(updated); }
    throw new Error(`Unexpected request: ${method} ${url.pathname}`);
  });
  render(<MemoryRouter initialEntries={["/mesas"]}><App service={new AuthService(new ApiClient("https://api.example.com", transport))} /></MemoryRouter>);
  const tableRequests = () => transport.mock.calls.filter(([input]) => String(input).includes("/tables"));
  return { tableRequests };
}

describe("Tables UI", () => {
  it("shows the OWNER list in exactly the server order", async () => {
    fixture({ tables: [baseTable, { ...baseTable, id: crypto.randomUUID(), number: "2", type: "room", active: false }] });
    const table = within(await screen.findByRole("table", { name: "Mesas do restaurante" }));
    expect(table.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["10", "2"]);
    expect(table.getAllByText("4 pessoas")).toHaveLength(2);
    for (const text of ["Mesa", "Sala", "Ativa", "Inativa"]) expect(table.getByText(text)).toBeTruthy();
  });

  it("hides access and dispatches no table API for STAFF", async () => {
    const { tableRequests } = fixture({ memberships: [{ restaurantId: restaurantA, role: "STAFF" }] });
    await screen.findByRole("heading", { name: "Visão geral" });
    expect(screen.queryByRole("link", { name: /Mesas/ })).toBeNull();
    expect(tableRequests()).toHaveLength(0);
  });

  it("shows loading, empty and non-occupancy guidance", async () => {
    fixture({ tables: [] });
    expect(screen.getByRole("status").textContent).toContain("Verificando");
    await screen.findByText("Nenhuma mesa cadastrada.");
    expect(screen.getByText(/Não representa ocupação/)).toBeTruthy();
  });

  it("creates a table through the real POST contract", async () => {
    const { tableRequests } = fixture({ tables: [] }); await screen.findByText("Nenhuma mesa cadastrada.");
    await userEvent.type(screen.getByLabelText("Número"), "7");
    await userEvent.clear(screen.getByLabelText("Capacidade")); await userEvent.type(screen.getByLabelText("Capacidade"), "8");
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "room");
    await userEvent.click(screen.getByRole("button", { name: "Criar mesa" })); await screen.findByText("Mesa criada.");
    const request = tableRequests().find(([, init]) => init?.method === "POST");
    expect(request?.[1]?.body).toBe(JSON.stringify({ number: "7", capacity: 8, type: "room" }));
  });

  it("updates number, capacity, type and active through PATCH", async () => {
    const { tableRequests } = fixture(); await screen.findByText("4 pessoas");
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.clear(screen.getByLabelText("Número")); await userEvent.type(screen.getByLabelText("Número"), "12");
    await userEvent.clear(screen.getByLabelText("Capacidade")); await userEvent.type(screen.getByLabelText("Capacidade"), "6");
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "room");
    await userEvent.click(screen.getByLabelText("Disponível para operação"));
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" })); await screen.findByText("Mesa atualizada.");
    const request = tableRequests().find(([, init]) => init?.method === "PATCH");
    expect(request?.[1]?.body).toBe(JSON.stringify({ number: "12", capacity: 6, type: "room", active: false }));
  });

  it("toggles active off and on without treating it as occupancy", async () => {
    const { tableRequests } = fixture(); await screen.findByText("4 pessoas");
    await userEvent.click(screen.getByRole("button", { name: "Desativar" })); await screen.findByText("Mesa desativada.");
    await userEvent.click(await screen.findByRole("button", { name: "Ativar" })); await screen.findByText("Mesa ativada.");
    expect(tableRequests().filter(([, init]) => init?.method === "PATCH").map(([, init]) => init?.body)).toEqual([JSON.stringify({ active: false }), JSON.stringify({ active: true })]);
  });

  it("preserves backend errors and supports retrying the list", async () => {
    let failList = true;
    fixture({ handler: (url, init) => {
      if ((init?.method ?? "GET") === "GET" && url.pathname.endsWith("/tables") && failList) return Response.json({ code: "TEMPORARY", message: "Mesas indisponíveis" }, { status: 503 });
      if (init?.method === "PATCH") return Response.json({ code: "TABLE_NUMBER_CONFLICT", message: "Número já utilizado" }, { status: 409 });
      return undefined;
    } });
    await screen.findByText("Mesas indisponíveis"); failList = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar carregar mesas novamente" })); await screen.findByText("4 pessoas");
    await userEvent.click(screen.getByRole("button", { name: "Editar" })); await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await screen.findByText("Número já utilizado (TABLE_NUMBER_CONFLICT)");
  });

  it("validates input before sending a mutation", async () => {
    const { tableRequests } = fixture({ tables: [] }); await screen.findByText("Nenhuma mesa cadastrada.");
    await userEvent.type(screen.getByLabelText("Número"), "A1");
    const before = tableRequests().length; await userEvent.click(screen.getByRole("button", { name: "Criar mesa" }));
    await screen.findByRole("alert"); expect(tableRequests()).toHaveLength(before);
  });

  it("prevents duplicate submit while creation is pending", async () => {
    let resolve: (response: Response) => void = () => {};
    const { tableRequests } = fixture({ tables: [], handler: (url, init) => init?.method === "POST" && url.pathname.endsWith("/tables") ? new Promise<Response>((done) => { resolve = done; }) : undefined });
    await screen.findByText("Nenhuma mesa cadastrada."); await userEvent.type(screen.getByLabelText("Número"), "9");
    const form = screen.getByRole("form", { name: "Nova mesa" }); fireEvent.submit(form); fireEvent.submit(form);
    await waitFor(() => expect(tableRequests().filter(([, init]) => init?.method === "POST")).toHaveLength(1));
    await act(async () => resolve(Response.json({ ...baseTable, number: "9" }, { status: 201 })));
  });

  it("clears editing and aborts stale requests when Restaurant changes", async () => {
    let resolve: (response: Response) => void = () => {};
    const { tableRequests } = fixture({ memberships: [{ restaurantId: restaurantA, role: "OWNER" }, { restaurantId: restaurantB, role: "OWNER" }], handler: (url, init) => {
      if ((init?.method ?? "GET") !== "GET" || !url.pathname.endsWith("/tables")) return undefined;
      if (url.pathname.includes(restaurantB)) return Response.json([]);
      return new Promise<Response>((done) => { resolve = done; });
    } });
    await screen.findByText("Qual casa vamos acompanhar?"); await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantA);
    await screen.findByText("Carregando mesas…"); const old = tableRequests().at(-1);
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantB); await screen.findByText("Nenhuma mesa cadastrada.");
    expect(old?.[1]?.signal?.aborted).toBe(true); expect(screen.getByRole("form", { name: "Nova mesa" })).toBeTruthy();
    await act(async () => resolve(Response.json([baseTable]))); expect(screen.queryByText("4 pessoas")).toBeNull();
  });

  it("does not expose a delete action because no endpoint exists", async () => {
    fixture(); await screen.findByText("4 pessoas"); expect(screen.queryByRole("button", { name: /Excluir/ })).toBeNull();
  });
});
