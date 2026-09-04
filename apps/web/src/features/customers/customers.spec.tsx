import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../app/app";
import { ApiClient } from "../../lib/api-client";
import { AuthService, type Membership } from "../auth/auth-service";
import type { Customer } from "./customers-service";

const restaurantA = "11111111-1111-4111-8111-111111111111";
const restaurantB = "22222222-2222-4222-8222-222222222222";
const customerId = "33333333-3333-4333-8333-333333333333";
const customer: Customer = { id: customerId, name: "Ana Silva", phone: "11912345678", email: "ana@example.com" };
type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>;

function listPayload(data: Customer[] = [customer], page = 1, total = data.length, limit = 20) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { data, meta: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 } };
}

function fixture(options: { memberships?: Membership[]; list?: Handler; detail?: Handler } = {}) {
  const memberships = options.memberships ?? [{ restaurantId: restaurantA, role: "OWNER" }];
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/session") return Response.json({ user: { id: restaurantA, email: "user@example.com" }, csrfToken: "customer-csrf", memberships });
    if (url.pathname === "/restaurants") return Response.json([{ id: restaurantA, name: "Centro" }, { id: restaurantB, name: "Norte" }]);
    if (/\/customers\/[^/]+$/.test(url.pathname)) return options.detail?.(url, init) ?? Response.json(customer);
    if (url.pathname.endsWith("/customers")) return options.list?.(url, init) ?? Response.json(listPayload());
    throw new Error(`Unexpected request: ${url.pathname}`);
  });
  render(<MemoryRouter initialEntries={["/clientes"]}><App service={new AuthService(new ApiClient("https://api.example.com", transport))} /></MemoryRouter>);
  const requests = () => transport.mock.calls.filter(([input]) => String(input).includes("/customers"));
  return { requests };
}

describe("Customers UI", () => {
  it("shows loading without treating it as empty", async () => {
    fixture({ list: () => new Promise<Response>(() => {}) });
    expect(await screen.findByText("Carregando clientes…")).toBeTruthy();
    expect(screen.queryByText(/Nenhum cliente relacionado/)).toBeNull();
  });

  it("renders the tenant list with phone formatting and email links", async () => {
    fixture();
    const table = within(await screen.findByRole("table", { name: "Clientes do restaurante" }));
    expect(table.getByText("Ana Silva")).toBeTruthy();
    expect(table.getByRole("link", { name: "(11) 91234-5678" }).getAttribute("href")).toBe("tel:11912345678");
    expect(table.getByRole("link", { name: "ana@example.com" }).getAttribute("href")).toBe("mailto:ana@example.com");
  });

  it("renders null email explicitly", async () => {
    fixture({ list: () => Response.json(listPayload([{ ...customer, email: null }])) });
    expect(await screen.findByText("Não informado")).toBeTruthy();
  });

  it("distinguishes an empty restaurant from a search without results", async () => {
    fixture({ list: (url) => Response.json(listPayload([], 1, 0, Number(url.searchParams.get("limit")))) });
    await screen.findByText("Nenhum cliente relacionado a este restaurante.");
    await userEvent.type(screen.getByLabelText("Buscar cliente"), "  telefone inexistente  ");
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await screen.findByText("Nenhum cliente encontrado para “telefone inexistente”.");
  });

  it("sends search to the server, resets page and clears it", async () => {
    const { requests } = fixture({ list: (url) => Response.json(listPayload([customer], Number(url.searchParams.get("page")), 42, Number(url.searchParams.get("limit")))) });
    await screen.findByText("Página 1 de 3 · 20 por página");
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 2 de 3 · 20 por página");
    await userEvent.type(screen.getByLabelText("Buscar cliente"), "  Ana  ");
    await userEvent.selectOptions(screen.getByLabelText("Por página"), "50");
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(Object.fromEntries(new URL(String(requests().at(-1)?.[0])).searchParams)).toEqual({ page: "1", limit: "50", search: "Ana" }));
    await userEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
    await waitFor(() => expect(Object.fromEntries(new URL(String(requests().at(-1)?.[0])).searchParams)).toEqual({ page: "1", limit: "20" }));
  });

  it("uses pagination metadata rather than the current row count", async () => {
    fixture({ list: (url) => Response.json(listPayload([customer], Number(url.searchParams.get("page")), 41, 20)) });
    await screen.findByText("Página 1 de 3 · 20 por página");
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 2 de 3 · 20 por página");
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 3 de 3 · 20 por página");
    expect(screen.getByRole("button", { name: "Próxima" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows list errors and retries", async () => {
    let fail = true;
    const { requests } = fixture({ list: () => fail ? Response.json({ code: "TEMPORARY", message: "Clientes indisponíveis" }, { status: 503 }) : Response.json(listPayload()) });
    expect((await screen.findByRole("alert")).textContent).toBe("Clientes indisponíveis");
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar carregar clientes novamente" }));
    await screen.findByRole("table", { name: "Clientes do restaurante" });
    expect(requests()).toHaveLength(2);
  });

  it("loads tenant-aware detail and retries a failure", async () => {
    let fail = true;
    const { requests } = fixture({ detail: () => fail ? Response.json({ code: "TEMPORARY", message: "Cliente indisponível" }, { status: 503 }) : Response.json(customer) });
    await userEvent.click(await screen.findByRole("button", { name: "Abrir cliente Ana Silva" }));
    await screen.findByText("Cliente indisponível");
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar carregar cliente novamente" }));
    const panel = within(await screen.findByRole("region", { name: "Dados do cliente" }));
    expect(panel.getByText("Ana Silva")).toBeTruthy();
    expect(requests().filter(([input]) => String(input).endsWith(`/customers/${customerId}`))).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /editar|excluir|criar/i })).toBeNull();
  });

  it.each(["OWNER", "STAFF"] as const)("allows %s to read customers without extra UX restrictions", async (role) => {
    fixture({ memberships: [{ restaurantId: restaurantA, role }] });
    expect(await screen.findByRole("heading", { name: "Clientes" })).toBeTruthy();
    expect(await screen.findByText("Ana Silva")).toBeTruthy();
  });

  it("clears detail and search and aborts stale requests on Restaurant switch", async () => {
    let resolveOld: (response: Response) => void = () => {};
    const { requests } = fixture({
      memberships: [{ restaurantId: restaurantA, role: "OWNER" }, { restaurantId: restaurantB, role: "STAFF" }],
      list: (url) => url.pathname.includes(restaurantA) && url.searchParams.has("search")
        ? new Promise<Response>((done) => { resolveOld = done; })
        : Response.json(listPayload([{ ...customer, name: url.pathname.includes(restaurantB) ? "Bruno Norte" : "Ana Silva" }])),
    });
    await screen.findByText("Qual casa vamos acompanhar?");
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantA);
    await screen.findByText("Ana Silva");
    await userEvent.type(screen.getByLabelText("Buscar cliente"), "Ana");
    fireEvent.submit(screen.getByRole("form", { name: "Busca de clientes" }));
    await screen.findByText("Carregando clientes…");
    const old = requests().at(-1);
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantB);
    await screen.findByText("Bruno Norte");
    expect(old?.[1]?.signal?.aborted).toBe(true);
    await act(async () => resolveOld(Response.json(listPayload([{ ...customer, name: "Resposta antiga" }]))));
    expect(screen.queryByText("Resposta antiga")).toBeNull();
    expect(Object.fromEntries(new URL(String(requests().at(-1)?.[0])).searchParams)).toEqual({ page: "1", limit: "20" });
  });

  it("clears the selected customer and aborts its detail on Restaurant switch", async () => {
    let resolveOld: (response: Response) => void = () => {};
    const { requests } = fixture({
      memberships: [{ restaurantId: restaurantA, role: "OWNER" }, { restaurantId: restaurantB, role: "STAFF" }],
      list: (url) => Response.json(listPayload([{ ...customer, name: url.pathname.includes(restaurantB) ? "Bruno Norte" : "Ana Silva" }])),
      detail: () => new Promise<Response>((done) => { resolveOld = done; }),
    });
    await screen.findByText("Qual casa vamos acompanhar?");
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantA);
    await userEvent.click(await screen.findByRole("button", { name: "Abrir cliente Ana Silva" }));
    await screen.findByText("Carregando cliente…");
    const oldDetail = requests().at(-1);
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantB);
    await screen.findByText("Bruno Norte");
    expect(oldDetail?.[1]?.signal?.aborted).toBe(true);
    await act(async () => resolveOld(Response.json(customer)));
    expect(screen.queryByRole("heading", { name: "Detalhe do cliente" })).toBeNull();
  });
});
