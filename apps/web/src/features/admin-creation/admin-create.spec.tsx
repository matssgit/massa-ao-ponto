import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../app/app";
import { ApiClient } from "../../lib/api-client";
import { AuthService, type Membership } from "../auth/auth-service";
import { reservationPeriod } from "../public-reservations/dates";
import { orderDetail, orderId, restaurantA } from "../orders/orders.test-data";
import { reservationId, reservationItem } from "../reservations/reservations.test-data";

const productId = "66666666-6666-4666-8666-666666666666";
const addonId = "77777777-7777-4777-8777-777777777777";
const tableId = "88888888-8888-4888-8888-888888888888";
const timestamp = "2026-09-15T12:00:00.000Z";
const restaurant = { id: restaurantA, name: "Massa Centro", address: "Rua A, 10", phone: "11999999999", timezone: "America/Sao_Paulo", deliveryEnabled: true, deliveryFeeCents: 900, whatsappNotificationsEnabled: false, createdAt: timestamp, updatedAt: timestamp };
const product = { id: productId, restaurantId: restaurantA, categoryId: orderId, name: "Pizza da casa", description: null, price: 4000, displayOrder: 1, active: true, createdAt: timestamp, updatedAt: timestamp };
const addon = { id: addonId, restaurantId: restaurantA, name: "Borda", description: null, price: 500, active: true, createdAt: timestamp, updatedAt: timestamp };
const table = { id: tableId, restaurantId: restaurantA, number: "7", capacity: 4, type: "table", active: true, createdAt: timestamp, updatedAt: timestamp };
type Handler = (body: unknown) => Response | Promise<Response>;

function fixture(route: "/pedidos" | "/reservas", options: { role?: Membership["role"]; createOrder?: Handler; createReservation?: Handler } = {}) {
  let createdOrder = orderDetail();
  let createdReservation = reservationItem();
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input)); const method = init?.method ?? "GET";
    if (url.pathname === "/auth/session") return Response.json({ user: { id: restaurantA, email: "operator@example.com" }, csrfToken: "create-csrf", memberships: [{ restaurantId: restaurantA, role: options.role ?? "STAFF" }] });
    if (url.pathname === "/restaurants") return Response.json([{ id: restaurantA, name: restaurant.name }]);
    if (url.pathname === `/restaurants/${restaurantA}`) return Response.json(restaurant);
    if (url.pathname === `/restaurants/${restaurantA}/products`) return Response.json([product]);
    if (url.pathname === `/restaurants/${restaurantA}/products/${productId}/addons`) return Response.json([addon]);
    if (url.pathname === `/restaurants/${restaurantA}/tables`) return Response.json([table]);
    if (url.pathname === `/restaurants/${restaurantA}/orders` && method === "GET") return Response.json({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false } });
    if (url.pathname === `/restaurants/${restaurantA}/orders` && method === "POST") {
      const body: unknown = JSON.parse(String(init?.body));
      if (options.createOrder) return options.createOrder(body);
      const value = body as { type: "PICKUP" | "DELIVERY" | "DINE_IN"; tableId?: string; deliveryFee: number; deliveryAddress?: Record<string, string> };
      createdOrder = orderDetail();
      createdOrder.order = { ...createdOrder.order, type: value.type, tableId: value.tableId ?? null, deliveryFee: value.deliveryFee, total: createdOrder.order.subtotal + value.deliveryFee, deliveryStreet: value.deliveryAddress?.street ?? null, deliveryNumber: value.deliveryAddress?.number ?? null, deliveryComplement: value.deliveryAddress?.complement ?? null, deliveryNeighborhood: value.deliveryAddress?.neighborhood ?? null, deliveryCity: value.deliveryAddress?.city ?? null, deliveryState: value.deliveryAddress?.state ?? null, deliveryZipCode: value.deliveryAddress?.zipCode ?? null };
      return Response.json(createdOrder.order, { status: 201 });
    }
    if (url.pathname === `/restaurants/${restaurantA}/orders/${orderId}`) return Response.json(createdOrder);
    if (url.pathname === `/restaurants/${restaurantA}/reservations` && method === "GET") return Response.json({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false } });
    if (url.pathname === `/restaurants/${restaurantA}/availability`) return Response.json([table]);
    if (url.pathname === `/restaurants/${restaurantA}/reservations` && method === "POST") {
      const body: unknown = JSON.parse(String(init?.body));
      if (options.createReservation) return options.createReservation(body);
      const value = body as { tableId: string; people: number; startsAt: string; endsAt: string; observation?: string };
      createdReservation = reservationItem();
      createdReservation.reservation = { ...createdReservation.reservation, id: reservationId, tableId: value.tableId, people: value.people, startsAt: value.startsAt, endsAt: value.endsAt, observation: value.observation ?? null };
      return Response.json(createdReservation.reservation, { status: 201 });
    }
    if (url.pathname === `/restaurants/${restaurantA}/reservations/${reservationId}`) return Response.json(createdReservation.reservation);
    if (url.pathname === `/restaurants/${restaurantA}/reservations/${reservationId}/history`) return Response.json([]);
    throw new Error(`Unexpected request: ${method} ${url.pathname}`);
  });
  render(<MemoryRouter initialEntries={[route]}><App service={new AuthService(new ApiClient("https://api.example.com", transport))} /></MemoryRouter>);
  const writes = (segment: "orders" | "reservations") => transport.mock.calls.filter(([input, init]) => new URL(String(input)).pathname === `/restaurants/${restaurantA}/${segment}` && init?.method === "POST");
  return { transport, writes };
}

async function openOrder() {
  await userEvent.click(await screen.findByRole("button", { name: "+ Novo pedido" }));
  await screen.findByRole("heading", { name: "Novo pedido" });
}
const orderForm = () => within(screen.getByRole("region", { name: "Novo pedido" }));
async function addProduct(withAddon = false) {
  await userEvent.selectOptions(screen.getByLabelText("Produto"), productId);
  if (withAddon) { const input = await screen.findByLabelText("Quantidade de Borda"); fireEvent.change(input, { target: { value: "2" } }); }
  await userEvent.click(screen.getByRole("button", { name: "Adicionar item" }));
}
async function fillCustomer(prefix: "order" | "reservation" = "order") {
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Cliente Balcão" } });
  fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "11988887777" } });
  fireEvent.change(screen.getByLabelText("E-mail (opcional)"), { target: { value: `${prefix}@example.com` } });
}
async function reviewAndCreateOrder() {
  await userEvent.click(screen.getByRole("button", { name: "Revisar pedido" }));
  await screen.findByRole("heading", { name: "Revisar pedido" });
  await userEvent.click(screen.getByRole("button", { name: "Confirmar pedido" }));
}

describe("Admin manual creation", () => {
  it.each(["OWNER", "STAFF"] as const)("allows %s to create PICKUP with valid addons and no client financial fields", async (role) => {
    const { writes } = fixture("/pedidos", { role });
    await openOrder(); await fillCustomer(); await addProduct(true); await reviewAndCreateOrder();
    await screen.findByRole("region", { name: "Resumo do pedido" });
    const body = JSON.parse(String(writes("orders")[0][1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ type: "PICKUP", deliveryFee: 0, customer: { name: "Cliente Balcão", phone: "11988887777", email: "order@example.com" }, items: [{ productId, quantity: 1, addons: [{ addonId, quantity: 2 }] }] });
    for (const forbidden of ["subtotal", "total", "price", "paymentStatus"]) expect(body).not.toHaveProperty(forbidden);
    expect(new Headers(writes("orders")[0][1]?.headers).get("X-CSRF-Token")).toBe("create-csrf");
  });

  it("creates DELIVERY with the configured fee and complete address", async () => {
    const { writes } = fixture("/pedidos"); await openOrder();
    await userEvent.selectOptions(orderForm().getByLabelText("Tipo"), "DELIVERY"); await fillCustomer(); await addProduct();
    for (const [label, value] of [["Rua", "Rua Um"], ["Número", "20"], ["Bairro", "Centro"], ["Cidade", "São Paulo"], ["Estado", "SP"], ["CEP", "01000000"]] as const) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    await reviewAndCreateOrder(); await screen.findByRole("region", { name: "Resumo do pedido" });
    expect(JSON.parse(String(writes("orders")[0][1]?.body))).toMatchObject({ type: "DELIVERY", deliveryFee: 900, deliveryAddress: { street: "Rua Um", number: "20", neighborhood: "Centro", city: "São Paulo", state: "SP", zipCode: "01000000" } });
  });

  it("creates DINE_IN only with an active selected table", async () => {
    const { writes } = fixture("/pedidos"); await openOrder();
    await userEvent.selectOptions(orderForm().getByLabelText("Tipo"), "DINE_IN"); await userEvent.selectOptions(orderForm().getByLabelText("Mesa"), tableId); await fillCustomer(); await addProduct();
    await reviewAndCreateOrder(); await screen.findByRole("region", { name: "Resumo do pedido" });
    expect(JSON.parse(String(writes("orders")[0][1]?.body))).toMatchObject({ type: "DINE_IN", tableId, deliveryFee: 0 });
  });

  it("checks availability in Restaurant timezone and opens the created Reservation", async () => {
    const { transport, writes } = fixture("/reservas");
    await userEvent.click(await screen.findByRole("button", { name: "+ Nova reserva" })); await fillCustomer("reservation");
    fireEvent.change(screen.getByLabelText("Pessoas"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2030-09-10T19:00" } });
    fireEvent.change(screen.getByLabelText("Término"), { target: { value: "2030-09-10T21:00" } });
    await userEvent.click(screen.getByRole("button", { name: "Consultar disponibilidade" }));
    await userEvent.click(await screen.findByLabelText(/Mesa 7/));
    await userEvent.click(screen.getByRole("button", { name: "Revisar reserva" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    await screen.findByRole("region", { name: "Resumo da reserva" });
    const expected = reservationPeriod("3", "2030-09-10T19:00", "2030-09-10T21:00", restaurant.timezone);
    const availability = transport.mock.calls.find(([input]) => new URL(String(input)).pathname.endsWith("/availability"));
    expect(Object.fromEntries(new URL(String(availability?.[0])).searchParams)).toEqual({ startsAt: expected.startsAt, endsAt: expected.endsAt, people: "3" });
    expect(JSON.parse(String(writes("reservations")[0][1]?.body))).toMatchObject({ tableId, customer: { name: "Cliente Balcão", phone: "11988887777", email: "reservation@example.com" }, people: 3, startsAt: expected.startsAt, endsAt: expected.endsAt });
  });

  it("blocks duplicate submits and requires list refresh after an uncertain Order result", async () => {
    let reject: (cause: Error) => void = () => {};
    const { writes } = fixture("/pedidos", { createOrder: () => new Promise<Response>((_, fail) => { reject = fail; }) });
    await openOrder(); await fillCustomer(); await addProduct();
    await userEvent.click(screen.getByRole("button", { name: "Revisar pedido" }));
    const submit = screen.getByRole("button", { name: "Confirmar pedido" }); fireEvent.click(submit); fireEvent.click(submit);
    expect(writes("orders")).toHaveLength(1);
    await act(async () => reject(new TypeError("network")));
    await screen.findByText(/Atualize a listagem antes de tentar novamente/);
    expect(screen.queryByRole("button", { name: "Confirmar pedido" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Voltar e atualizar listagem" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "+ Novo pedido" })).toBeTruthy());
  });

  it("blocks duplicate Reservation submits after an uncertain result", async () => {
    let reject: (cause: Error) => void = () => {};
    const { writes } = fixture("/reservas", { createReservation: () => new Promise<Response>((_, fail) => { reject = fail; }) });
    await userEvent.click(await screen.findByRole("button", { name: "+ Nova reserva" })); await fillCustomer("reservation");
    fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2030-09-10T19:00" } });
    fireEvent.change(screen.getByLabelText("Término"), { target: { value: "2030-09-10T21:00" } });
    await userEvent.click(screen.getByRole("button", { name: "Consultar disponibilidade" }));
    await userEvent.click(await screen.findByLabelText(/Mesa 7/));
    await userEvent.click(screen.getByRole("button", { name: "Revisar reserva" }));
    const submit = screen.getByRole("button", { name: "Confirmar reserva" }); fireEvent.click(submit); fireEvent.click(submit);
    expect(writes("reservations")).toHaveLength(1);
    await act(async () => reject(new TypeError("network")));
    await screen.findByText(/Atualize a agenda antes de tentar novamente/);
    expect(screen.queryByRole("button", { name: "Confirmar reserva" })).toBeNull();
  });
});
