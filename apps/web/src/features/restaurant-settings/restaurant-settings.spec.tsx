import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../app/app";
import { ApiClient } from "../../lib/api-client";
import { AuthService, type Membership } from "../auth/auth-service";
import type { RestaurantDetails } from "./restaurant-settings-service";

const restaurantA = "11111111-1111-4111-8111-111111111111";
const restaurantB = "22222222-2222-4222-8222-222222222222";
const timestamp = "2026-09-04T12:00:00.000Z";
const details: RestaurantDetails = { id: restaurantA, name: "Massa Centro", address: "Rua A, 10", phone: "11999999999", timezone: "America/Sao_Paulo", createdAt: timestamp, updatedAt: timestamp };
type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response> | undefined;

function fixture(options: { memberships?: Membership[]; handler?: Handler } = {}) {
  let restaurant = details;
  const memberships = options.memberships ?? [{ restaurantId: restaurantA, role: "OWNER" }];
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input)); const method = init?.method ?? "GET";
    if (url.pathname === "/auth/session") return Response.json({ user: { id: crypto.randomUUID(), email: "owner@example.com" }, csrfToken: "settings-csrf", memberships });
    if (url.pathname === "/restaurants") return Response.json([{ id: restaurantA, name: "Massa Centro" }, { id: restaurantB, name: "Massa Norte" }]);
    if (url.pathname.includes("/dashboard/")) return url.pathname.endsWith("sales-summary") ? Response.json({ period: { startsAt: null, endsAt: null }, orders: { total: 0, paid: 0, pending: 0, delivered: 0, cancelled: 0 }, revenue: 0, averageTicket: 0 }) : Response.json([]);
    const overridden = options.handler?.(url, init); if (overridden) return overridden;
    if (method === "GET" && url.pathname === `/restaurants/${restaurantA}`) return Response.json(restaurant);
    if (method === "GET" && url.pathname === `/restaurants/${restaurantB}`) return Response.json({ ...restaurant, id: restaurantB, name: "Massa Norte", address: "Rua B, 20" });
    if (method === "PATCH" && url.pathname === `/restaurants/${restaurantA}`) { restaurant = { ...restaurant, ...JSON.parse(String(init?.body)) }; return Response.json(restaurant); }
    throw new Error(`Unexpected request: ${method} ${url.pathname}`);
  });
  render(<MemoryRouter initialEntries={["/configuracoes"]}><App service={new AuthService(new ApiClient("https://api.example.com", transport))} /></MemoryRouter>);
  const detailRequests = () => transport.mock.calls.filter(([input]) => /^\/restaurants\/[0-9a-f-]+$/.test(new URL(String(input)).pathname));
  return { detailRequests };
}

describe("Restaurant Settings UI", () => {
  it("loads and fills the real settings form for OWNER", async () => {
    fixture(); expect(screen.getByRole("status").textContent).toContain("Verificando");
    expect((await screen.findByLabelText("Nome do restaurante") as HTMLInputElement).value).toBe("Massa Centro");
    expect((screen.getByLabelText("Endereço") as HTMLInputElement).value).toBe("Rua A, 10");
    expect((screen.getByLabelText("Telefone") as HTMLInputElement).value).toBe("11999999999");
    expect((screen.getByLabelText("Timezone") as HTMLInputElement).value).toBe("America/Sao_Paulo");
  });

  it("hides access and dispatches no detail or mutation request for STAFF", async () => {
    const { detailRequests } = fixture({ memberships: [{ restaurantId: restaurantA, role: "STAFF" }] });
    await screen.findByRole("heading", { name: "Visão geral" });
    expect(screen.queryByRole("link", { name: /Configurações/ })).toBeNull(); expect(detailRequests()).toHaveLength(0);
  });

  it("updates name, address, phone and timezone with the supported PATCH payload", async () => {
    const { detailRequests } = fixture(); await screen.findByLabelText("Nome do restaurante");
    await userEvent.clear(screen.getByLabelText("Nome do restaurante")); await userEvent.type(screen.getByLabelText("Nome do restaurante"), "Massa Jardins");
    await userEvent.clear(screen.getByLabelText("Endereço")); await userEvent.type(screen.getByLabelText("Endereço"), "Rua Nova, 30");
    await userEvent.clear(screen.getByLabelText("Telefone")); await userEvent.type(screen.getByLabelText("Telefone"), "1133334444");
    await userEvent.clear(screen.getByLabelText("Timezone")); await userEvent.type(screen.getByLabelText("Timezone"), "UTC");
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" })); await screen.findByText("Configurações atualizadas.");
    const patch = detailRequests().find(([, init]) => init?.method === "PATCH");
    expect(patch?.[1]?.body).toBe(JSON.stringify({ name: "Massa Jardins", address: "Rua Nova, 30", phone: "1133334444", timezone: "UTC" }));
  });

  it("reflects the updated name in the shell without a page reload", async () => {
    fixture(); await screen.findByLabelText("Nome do restaurante");
    await userEvent.clear(screen.getByLabelText("Nome do restaurante")); await userEvent.type(screen.getByLabelText("Nome do restaurante"), "Casa Renovada");
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(await screen.findByRole("option", { name: "Casa Renovada" })).toBeTruthy();
    expect((screen.getByLabelText("RESTAURANTE") as HTMLSelectElement).value).toBe(restaurantA);
  });

  it("detects an unchanged form and sends no PATCH", async () => {
    const { detailRequests } = fixture(); await screen.findByLabelText("Nome do restaurante");
    expect(screen.getByText("Nenhuma alteração para salvar.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Salvar alterações" }) as HTMLButtonElement).disabled).toBe(true);
    expect(detailRequests().filter(([, init]) => init?.method === "PATCH")).toHaveLength(0);
  });

  it("prevents duplicate submit while a mutation is pending", async () => {
    let resolve: (response: Response) => void = () => {};
    const { detailRequests } = fixture({ handler: (url, init) => init?.method === "PATCH" && url.pathname === `/restaurants/${restaurantA}` ? new Promise<Response>((done) => { resolve = done; }) : undefined });
    await screen.findByLabelText("Nome do restaurante"); await userEvent.clear(screen.getByLabelText("Nome do restaurante")); await userEvent.type(screen.getByLabelText("Nome do restaurante"), "Casa Nova");
    const form = screen.getByRole("form", { name: "Configurações do restaurante" }); fireEvent.submit(form); fireEvent.submit(form);
    await waitFor(() => expect(detailRequests().filter(([, init]) => init?.method === "PATCH")).toHaveLength(1));
    await act(async () => resolve(Response.json({ ...details, name: "Casa Nova" })));
  });

  it("preserves backend mutation errors and keeps edited values", async () => {
    fixture({ handler: (url, init) => init?.method === "PATCH" && url.pathname === `/restaurants/${restaurantA}` ? Response.json({ code: "INVALID_TIMEZONE", message: "Timezone não aceito" }, { status: 400 }) : undefined });
    await screen.findByLabelText("Timezone"); await userEvent.clear(screen.getByLabelText("Timezone")); await userEvent.type(screen.getByLabelText("Timezone"), "Invalid/Zone");
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await screen.findByText("Timezone não aceito (INVALID_TIMEZONE)"); expect((screen.getByLabelText("Timezone") as HTMLInputElement).value).toBe("Invalid/Zone");
  });

  it("shows read errors and retries cleanly", async () => {
    let fail = true;
    fixture({ handler: (url, init) => (init?.method ?? "GET") === "GET" && url.pathname === `/restaurants/${restaurantA}` && fail ? Response.json({ code: "TEMPORARY", message: "Configuração indisponível" }, { status: 503 }) : undefined });
    await screen.findByText("Configuração indisponível"); fail = false; await userEvent.click(screen.getByRole("button", { name: "Tentar carregar novamente" }));
    expect(await screen.findByLabelText("Nome do restaurante")).toBeTruthy();
  });

  it("validates blank fields without dispatching PATCH", async () => {
    const { detailRequests } = fixture(); await screen.findByLabelText("Nome do restaurante");
    await userEvent.clear(screen.getByLabelText("Nome do restaurante")); fireEvent.submit(screen.getByRole("form", { name: "Configurações do restaurante" }));
    await screen.findByRole("alert"); expect(detailRequests().filter(([, init]) => init?.method === "PATCH")).toHaveLength(0);
  });

  it("resets the form and ignores stale detail responses after Restaurant changes", async () => {
    let resolve: (response: Response) => void = () => {};
    const { detailRequests } = fixture({ memberships: [{ restaurantId: restaurantA, role: "OWNER" }, { restaurantId: restaurantB, role: "OWNER" }], handler: (url, init) => {
      if ((init?.method ?? "GET") !== "GET") return undefined;
      if (url.pathname === `/restaurants/${restaurantA}`) return new Promise<Response>((done) => { resolve = done; });
      if (url.pathname === `/restaurants/${restaurantB}`) return Response.json({ ...details, id: restaurantB, name: "Massa Norte", address: "Rua B, 20" });
      return undefined;
    } });
    await screen.findByText("Qual casa vamos acompanhar?"); await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantA);
    await screen.findByText("Carregando configurações…"); const old = detailRequests().at(-1);
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantB);
    expect((await screen.findByLabelText("Nome do restaurante") as HTMLInputElement).value).toBe("Massa Norte"); expect(old?.[1]?.signal?.aborted).toBe(true);
    await act(async () => resolve(Response.json(details))); expect((screen.getByLabelText("Nome do restaurante") as HTMLInputElement).value).toBe("Massa Norte");
  });
});
