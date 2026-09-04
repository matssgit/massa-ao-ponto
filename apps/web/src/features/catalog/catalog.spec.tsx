import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../app/app";
import { ApiClient } from "../../lib/api-client";
import { AuthService, type Membership } from "../auth/auth-service";
import type { Addon, Category, Product } from "./catalog-service";

const restaurantA = "11111111-1111-4111-8111-111111111111";
const restaurantB = "22222222-2222-4222-8222-222222222222";
const categoryId = "33333333-3333-4333-8333-333333333333";
const productId = "44444444-4444-4444-8444-444444444444";
const addonId = "55555555-5555-4555-8555-555555555555";
const timestamp = "2026-09-04T12:00:00.000Z";
const category: Category = { id: categoryId, restaurantId: restaurantA, name: "Pizzas", description: "Sabores da casa", active: true, displayOrder: 1, createdAt: timestamp, updatedAt: timestamp };
const product: Product = { id: productId, restaurantId: restaurantA, categoryId, name: "Margherita", description: "Molho e queijo", price: 4290, active: true, displayOrder: 2, createdAt: timestamp, updatedAt: timestamp };
const addon: Addon = { id: addonId, restaurantId: restaurantA, name: "Borda", description: "Catupiry", price: 750, active: true, createdAt: timestamp, updatedAt: timestamp };
type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response> | undefined;

function fixture(options: { memberships?: Membership[]; categories?: Category[]; products?: Product[]; addons?: Addon[]; handler?: Handler } = {}) {
  let categories = options.categories ?? [category]; let products = options.products ?? [product]; let addons = options.addons ?? [addon];
  const memberships = options.memberships ?? [{ restaurantId: restaurantA, role: "OWNER" }];
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input)); const method = init?.method ?? "GET";
    if (url.pathname === "/auth/session") return Response.json({ user: { id: restaurantA, email: "owner@example.com" }, csrfToken: "catalog-csrf", memberships });
    if (url.pathname === "/restaurants") return Response.json([{ id: restaurantA, name: "Centro" }, { id: restaurantB, name: "Norte" }]);
    const overridden = options.handler?.(url, init); if (overridden) return overridden;
    if (method === "GET" && url.pathname.endsWith("/product-categories")) return Response.json(categories.map((item) => ({ ...item, restaurantId: url.pathname.includes(restaurantB) ? restaurantB : restaurantA })));
    if (method === "GET" && /\/products\/[^/]+\/addons$/.test(url.pathname)) return Response.json([]);
    if (method === "GET" && url.pathname.endsWith("/products")) return Response.json(products.map((item) => ({ ...item, restaurantId: url.pathname.includes(restaurantB) ? restaurantB : restaurantA })));
    if (method === "GET" && url.pathname.endsWith("/addons")) return Response.json(addons.map((item) => ({ ...item, restaurantId: url.pathname.includes(restaurantB) ? restaurantB : restaurantA })));
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    if (method === "POST" && url.pathname.endsWith("/product-categories")) { const created = { ...category, ...body, id: crypto.randomUUID() }; categories = [...categories, created]; return Response.json(created, { status: 201 }); }
    if (method === "PATCH" && url.pathname.endsWith(`/product-categories/${categoryId}`)) { const updated = { ...category, ...body }; categories = categories.map((item) => item.id === categoryId ? updated : item); return Response.json(updated); }
    if (method === "POST" && url.pathname.endsWith("/products")) { const created = { ...product, ...body, id: crypto.randomUUID() }; products = [...products, created]; return Response.json(created, { status: 201 }); }
    if (method === "PATCH" && url.pathname.endsWith(`/products/${productId}`)) { const updated = { ...product, ...body }; products = products.map((item) => item.id === productId ? updated : item); return Response.json(updated); }
    if (method === "POST" && url.pathname.endsWith("/addons")) { const created = { ...addon, ...body, id: crypto.randomUUID() }; addons = [...addons, created]; return Response.json(created, { status: 201 }); }
    if (method === "PATCH" && url.pathname.endsWith(`/addons/${addonId}`)) { const updated = { ...addon, ...body }; addons = addons.map((item) => item.id === addonId ? updated : item); return Response.json(updated); }
    if (url.pathname.endsWith("/toggle-status")) return Response.json(url.pathname.includes("product-categories") ? { ...category, active: false } : url.pathname.includes("products") ? { ...product, active: false } : { ...addon, active: false });
    if (method === "DELETE") return new Response(null, { status: 204 });
    if (method === "POST" && url.pathname.includes("/addons/")) return new Response(null, { status: 201 });
    throw new Error(`Unexpected request: ${method} ${url.pathname}`);
  });
  render(<MemoryRouter initialEntries={["/cardapio"]}><App service={new AuthService(new ApiClient("https://api.example.com", transport))} /></MemoryRouter>);
  const catalogRequests = () => transport.mock.calls.filter(([input]) => /product-categories|products|addons/.test(String(input)));
  return { catalogRequests };
}

async function tab(name: string) {
  const navigation = await screen.findByRole("navigation", { name: "Áreas do cardápio" });
  await userEvent.click(within(navigation).getByRole("button", { name }));
}

describe("Catalog UI", () => {
  it("shows products with category, integer-cent price and status for OWNER", async () => {
    fixture(); const table = within(await screen.findByRole("table", { name: "Produtos do cardápio" }));
    for (const text of ["Margherita", "Pizzas", "Ativo"]) expect(table.getByText(text)).toBeTruthy();
    expect(table.getByText(/42,90/)).toBeTruthy();
  });

  it("hides OWNER-only navigation and makes no catalog request for STAFF", async () => {
    const { catalogRequests } = fixture({ memberships: [{ restaurantId: restaurantA, role: "STAFF" }] });
    await screen.findByRole("heading", { name: "Visão geral" });
    expect(screen.queryByRole("link", { name: /Cardápio/ })).toBeNull();
    expect(catalogRequests()).toHaveLength(0);
  });

  it("lists, creates and updates categories", async () => {
    const { catalogRequests } = fixture(); await tab("Categorias");
    expect(await screen.findByText("Sabores da casa")).toBeTruthy();
    await userEvent.type(screen.getByLabelText("Nome"), "Doces");
    await userEvent.clear(screen.getByLabelText("Ordem de exibição")); await userEvent.type(screen.getByLabelText("Ordem de exibição"), "4");
    await userEvent.click(screen.getByRole("button", { name: "Salvar categoria" }));
    await screen.findByText("Categoria criada.");
    const create = catalogRequests().find(([, init]) => init?.method === "POST");
    expect(create?.[1]?.body).toBe(JSON.stringify({ name: "Doces", description: null, displayOrder: 4 }));
    await userEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    await userEvent.clear(screen.getByLabelText("Nome")); await userEvent.type(screen.getByLabelText("Nome"), "Pizzas especiais");
    await userEvent.click(screen.getByRole("button", { name: "Salvar categoria" }));
    await screen.findByText("Categoria atualizada.");
  });

  it("requires explicit confirmation before deleting a category", async () => {
    const { catalogRequests } = fixture(); await tab("Categorias"); await screen.findByText("Pizzas");
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(catalogRequests().some(([, init]) => init?.method === "DELETE")).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Manter item" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await screen.findByText("Categoria excluída.");
  });

  it("creates and updates products using integer cents", async () => {
    const { catalogRequests } = fixture(); await screen.findByText("Margherita");
    await userEvent.type(screen.getByLabelText("Nome"), "Calabresa"); await userEvent.clear(screen.getByLabelText("Preço (R$)")); await userEvent.type(screen.getByLabelText("Preço (R$)"), "39,90");
    await userEvent.click(screen.getByRole("button", { name: "Salvar produto" })); await screen.findByText("Produto criado.");
    expect(JSON.parse(String(catalogRequests().find(([, init]) => init?.method === "POST")?.[1]?.body)).price).toBe(3990);
    await userEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    expect((screen.getByLabelText("Preço (R$)") as HTMLInputElement).value).toBe("42,90");
    await userEvent.clear(screen.getByLabelText("Nome")); await userEvent.type(screen.getByLabelText("Nome"), "Margherita premium");
    await userEvent.click(screen.getByRole("button", { name: "Salvar produto" })); await screen.findByText("Produto atualizado.");
  });

  it("prevents duplicate product submission while a mutation is pending", async () => {
    let resolve: (response: Response) => void = () => {};
    const { catalogRequests } = fixture({ handler: (url, init) => init?.method === "POST" && url.pathname.endsWith("/products") ? new Promise<Response>((done) => { resolve = done; }) : undefined });
    await screen.findByText("Margherita"); await userEvent.type(screen.getByLabelText("Nome"), "Nova pizza");
    const form = screen.getByRole("form", { name: "Novo produto" }); fireEvent.submit(form); fireEvent.submit(form);
    await waitFor(() => expect(catalogRequests().filter(([, init]) => init?.method === "POST")).toHaveLength(1));
    await act(async () => resolve(Response.json({ ...product, name: "Nova pizza" }, { status: 201 })));
  });

  it("lists, creates and updates addons", async () => {
    const { catalogRequests } = fixture(); await tab("Adicionais"); expect(await screen.findByText("Catupiry")).toBeTruthy();
    await userEvent.type(screen.getByLabelText("Nome"), "Bacon"); await userEvent.clear(screen.getByLabelText("Preço (R$)")); await userEvent.type(screen.getByLabelText("Preço (R$)"), "5,50");
    await userEvent.click(screen.getByRole("button", { name: "Salvar adicional" })); await screen.findByText("Adicional criado.");
    expect(JSON.parse(String(catalogRequests().find(([, init]) => init?.method === "POST")?.[1]?.body)).price).toBe(550);
    await userEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]); await userEvent.clear(screen.getByLabelText("Nome")); await userEvent.type(screen.getByLabelText("Nome"), "Borda recheada");
    await userEvent.click(screen.getByRole("button", { name: "Salvar adicional" })); await screen.findByText("Adicional atualizado.");
  });

  it("manages the existing Product-Addon association", async () => {
    const { catalogRequests } = fixture(); await screen.findByText("Margherita");
    const row = screen.getByText("Margherita").closest("tr");
    if (!row) throw new Error("Product row not found");
    await userEvent.click(within(row).getByRole("button", { name: "Adicionais" }));
    const checkbox = await screen.findByRole("checkbox"); expect((checkbox as HTMLInputElement).checked).toBe(false);
    await userEvent.click(checkbox); await screen.findByText("Adicional associado.");
    const association = catalogRequests().find(([input, init]) => String(input).endsWith(`/products/${productId}/addons/${addonId}`) && init?.method === "POST");
    expect(association).toBeTruthy();
  });

  it("toggles category, product and addon status through their real routes", async () => {
    const { catalogRequests } = fixture();
    await screen.findByText("Margherita");
    await userEvent.click(screen.getByRole("button", { name: "Desativar" }));
    await screen.findByText("Produto desativado.");
    await tab("Categorias"); await screen.findByText("Pizzas");
    await userEvent.click(screen.getByRole("button", { name: "Desativar" }));
    await screen.findByText("Categoria desativada.");
    await tab("Adicionais"); await screen.findByText("Catupiry");
    await userEvent.click(screen.getByRole("button", { name: "Desativar" }));
    await screen.findByText("Adicional desativado.");
    expect(catalogRequests().filter(([input, init]) => String(input).endsWith("/toggle-status") && init?.method === "PATCH")).toHaveLength(3);
  });

  it("requires confirmation for product and addon deletion", async () => {
    const { catalogRequests } = fixture();
    await screen.findByText("Margherita");
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(catalogRequests().filter(([, init]) => init?.method === "DELETE")).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await screen.findByText("Produto excluído.");
    await tab("Adicionais"); await screen.findByText("Catupiry");
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    await screen.findByText("Adicional excluído.");
    expect(catalogRequests().filter(([, init]) => init?.method === "DELETE")).toHaveLength(2);
  });

  it("shows all three empty states", async () => {
    fixture({ products: [], categories: [], addons: [] });
    await screen.findByText("Nenhum produto cadastrado."); await tab("Categorias"); await screen.findByText("Nenhuma categoria cadastrada."); await tab("Adicionais"); await screen.findByText("Nenhum adicional cadastrado.");
  });

  it("shows list errors with retry and preserves backend mutation errors", async () => {
    let failList = true; let failMutation = true;
    fixture({ handler: (url, init) => {
      if ((init?.method ?? "GET") === "GET" && url.pathname.endsWith("/products") && failList) return Response.json({ code: "TEMPORARY", message: "Cardápio indisponível" }, { status: 503 });
      if (init?.method === "PATCH" && url.pathname.endsWith(`/products/${productId}`) && failMutation) return Response.json({ code: "PRODUCT_CONFLICT", message: "Produto não pôde ser salvo" }, { status: 409 });
      return undefined;
    } });
    await screen.findByText("Cardápio indisponível"); failList = false; await userEvent.click(screen.getByRole("button", { name: "Tentar carregar produtos novamente" })); await screen.findByText("Margherita");
    await userEvent.click(screen.getByRole("button", { name: "Editar" })); await userEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    await screen.findByText("Produto não pôde ser salvo (PRODUCT_CONFLICT)"); failMutation = false;
  });

  it("validates forms before sending a request", async () => {
    const { catalogRequests } = fixture(); await screen.findByText("Margherita");
    await userEvent.type(screen.getByLabelText("Nome"), "Pizza"); await userEvent.clear(screen.getByLabelText("Preço (R$)")); await userEvent.type(screen.getByLabelText("Preço (R$)"), "12,345");
    const before = catalogRequests().length; await userEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    await screen.findByRole("alert"); expect(catalogRequests()).toHaveLength(before);
  });

  it("resets the tab and aborts stale requests when Restaurant changes", async () => {
    let resolve: (response: Response) => void = () => {};
    const { catalogRequests } = fixture({ memberships: [{ restaurantId: restaurantA, role: "OWNER" }, { restaurantId: restaurantB, role: "OWNER" }], handler: (url, init) => (init?.method ?? "GET") === "GET" && url.pathname.includes(restaurantA) && url.pathname.endsWith("/addons") ? new Promise<Response>((done) => { resolve = done; }) : undefined });
    await screen.findByText("Qual casa vamos acompanhar?"); await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantA); await tab("Adicionais"); await screen.findByText("Carregando adicionais…");
    const old = catalogRequests().at(-1); await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantB); await screen.findByRole("heading", { name: "Produtos" });
    expect(old?.[1]?.signal?.aborted).toBe(true); await act(async () => resolve(Response.json([addon]))); expect(screen.queryByRole("heading", { name: "Adicionais" })).toBeNull();
  });
});
