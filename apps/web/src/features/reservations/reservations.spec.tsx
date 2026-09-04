import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { App } from "../../app/app";
import { ApiClient } from "../../lib/api-client";
import { AuthService, type Membership } from "../auth/auth-service";
import { reservationStatusSchema, type ReservationHistoryEntry, type ReservationListItem } from "./reservations-service";
import { createdAt, customerId, reservationId, reservationItem, restaurantA, restaurantB, tableId } from "./reservations.test-data";

type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>;
function listPayload(item: ReservationListItem, page = 1, total = 1, limit = 20) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { data: total === 0 ? [] : [item], meta: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 } };
}
function fixture(options: { item?: ReservationListItem; memberships?: Membership[]; list?: Handler; detail?: Handler; history?: Handler; availability?: Handler; mutation?: Handler } = {}) {
  let item = options.item ?? reservationItem();
  const history: ReservationHistoryEntry[] = [{ id: restaurantB, reservationId, action: "CREATED", previousStatus: null, newStatus: "SCHEDULED", observation: null, createdAt }];
  const memberships = options.memberships ?? [{ restaurantId: restaurantA, role: "OWNER" }];
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/session") return Response.json({ user: { id: restaurantA, email: "user@example.com" }, csrfToken: "reservations-csrf", memberships });
    if (url.pathname === "/restaurants") return Response.json([{ id: restaurantA, name: "Centro" }, { id: restaurantB, name: "Norte" }]);
    if (url.pathname.endsWith("/availability")) return options.availability?.(url, init) ?? Response.json([{ ...item.table, id: restaurantB, number: "15" }]);
    if (url.pathname.endsWith("/history")) return options.history?.(url, init) ?? Response.json(history);
    if (url.pathname.endsWith("/reservations")) return options.list?.(url, init) ?? Response.json(listPayload(item));
    if (init?.method === "GET") return options.detail?.(url, init) ?? Response.json(item.reservation);
    if (options.mutation) return options.mutation(url, init);
    if (url.pathname.endsWith("/status")) {
      const body: unknown = JSON.parse(String(init?.body));
      const { status } = z.object({ status: reservationStatusSchema }).parse(body);
      item = { ...item, reservation: { ...item.reservation, status } };
      history.push({ id: customerId, reservationId, action: "STATUS_CHANGED", previousStatus: "SCHEDULED", newStatus: status, observation: null, createdAt });
      return Response.json(item.reservation);
    }
    if (url.pathname.endsWith("/cancel")) {
      item = { ...item, reservation: { ...item.reservation, status: "CANCELLED" } };
      return Response.json(item.reservation);
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  });
  render(<MemoryRouter initialEntries={["/reservas"]}><App service={new AuthService(new ApiClient("https://api.example.com", transport))} /></MemoryRouter>);
  const requests = () => transport.mock.calls.filter(([url]) => String(url).includes("/reservations") || String(url).includes("/availability"));
  const writes = () => requests().filter(([, init]) => init?.method !== "GET");
  return { requests, writes };
}
async function open() {
  await userEvent.click(await screen.findByRole("button", { name: /Abrir reserva/ }));
  await screen.findByRole("region", { name: "Resumo da reserva" });
}
const summary = () => within(screen.getByRole("region", { name: "Resumo da reserva" }));

describe("Reservations UI", () => {
  it("shows loading without treating it as empty", async () => {
    fixture({ list: () => new Promise<Response>(() => {}) });
    expect(await screen.findByText("Carregando reservas…")).toBeTruthy();
    expect(screen.queryByText(/Nenhuma reserva nesta página/)).toBeNull();
  });

  it("renders empty results and metadata", async () => {
    fixture({ list: () => Response.json(listPayload(reservationItem(), 1, 0)) });
    await screen.findByText(/Nenhuma reserva nesta página/);
    expect(screen.getByText("0 reservas encontradas · Horário inicial crescente")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Próxima" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows API errors and retries the list", async () => {
    let fail = true;
    const { requests } = fixture({ list: () => fail ? Response.json({ code: "TEMPORARY", message: "Agenda indisponível" }, { status: 503 }) : Response.json(listPayload(reservationItem())) });
    expect((await screen.findByRole("alert")).textContent).toBe("Agenda indisponível");
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar carregar reservas novamente" }));
    await screen.findByRole("table", { name: "Agenda de reservas" });
    expect(requests()).toHaveLength(2);
  });

  it("rejects malformed list responses", async () => {
    fixture({ list: () => Response.json({ data: [], meta: {} }) });
    await screen.findByRole("alert");
    expect(screen.queryByText(/0 reservas encontradas/)).toBeNull();
  });

  it("renders customer, table, people, status and interval from the read model", async () => {
    fixture();
    const table = within(await screen.findByRole("table", { name: "Agenda de reservas" }));
    for (const text of ["Ana Silva", "12", "3 pessoas", "Agendada", "INTERNA · até 4"]) expect(table.getByText(text)).toBeTruthy();
    expect(table.getAllByText(/10\/09\/2099/)).toHaveLength(2);
  });

  it("uses metadata for pagination and resets the page on filters", async () => {
    const { requests } = fixture({ list: (url) => Response.json(listPayload(reservationItem(), Number(url.searchParams.get("page")), 42, Number(url.searchParams.get("limit")))) });
    await screen.findByText("Página 1 de 3 · 20 por página");
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 2 de 3 · 20 por página");
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await screen.findByText("Página 3 de 3 · 20 por página");
    expect(screen.getByRole("button", { name: "Próxima" }).hasAttribute("disabled")).toBe(true);
    await userEvent.selectOptions(screen.getByLabelText("Status"), "CONFIRMED");
    await userEvent.selectOptions(screen.getByLabelText("Por página"), "100");
    fireEvent.change(screen.getByLabelText("Agenda de"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-09-03" } });
    await userEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await screen.findByText("Página 1 de 1 · 100 por página");
    const params = Object.fromEntries(new URL(String(requests().at(-1)?.[0])).searchParams);
    expect(params.page).toBe("1"); expect(params.limit).toBe("100"); expect(params.status).toBe("CONFIRMED");
    expect(new Date(params.startsAt).getHours()).toBe(0);
    const end = new Date(params.endsAt); expect(end.getDate()).toBe(4); expect(end.getHours()).toBe(0);
  });

  it("supports either open temporal boundary and rejects reversed dates", async () => {
    const { requests } = fixture();
    await screen.findByRole("table");
    fireEvent.change(screen.getByLabelText("Agenda de"), { target: { value: "2026-09-03" } });
    await userEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await waitFor(() => expect(new URL(String(requests().at(-1)?.[0])).searchParams.has("startsAt")).toBe(true));
    expect(new URL(String(requests().at(-1)?.[0])).searchParams.has("endsAt")).toBe(false);
    fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2026-09-01" } });
    await userEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await screen.findByRole("alert");
    expect(requests()).toHaveLength(2);
  });

  it("loads detail and history from separate endpoints while keeping list relations", async () => {
    const item = reservationItem();
    item.customer.name = "Cliente hidratado";
    item.table.number = "42";
    fixture({ item });
    await open();
    expect(summary().getByText("Cliente hidratado")).toBeTruthy();
    expect(summary().getByText("42 · INTERNA")).toBeTruthy();
    expect(screen.getByText("Observação: Aniversário")).toBeTruthy();
    const history = screen.getByRole("region", { name: "Histórico da reserva" });
    expect(within(history).getByText("Reserva criada")).toBeTruthy();
    expect(within(history).getByText("Agendada")).toBeTruthy();
  });

  it("handles detail/history failure as one incomplete detail and retries both", async () => {
    let fail = true;
    const { requests } = fixture({ history: () => fail ? Response.json({ code: "TEMPORARY", message: "Histórico indisponível" }, { status: 503 }) : Response.json([]) });
    await userEvent.click(await screen.findByRole("button", { name: /Abrir reserva/ }));
    await screen.findByText("Histórico indisponível");
    expect(screen.queryByRole("button", { name: "Confirmar reserva" })).toBeNull();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar carregar detalhe novamente" }));
    await screen.findByRole("button", { name: "Confirmar reserva" });
    expect(requests().filter(([url]) => String(url).endsWith("/history"))).toHaveLength(2);
  });

  it("queries availability only when requested with exact interval and people", async () => {
    const { requests } = fixture();
    await open();
    expect(requests().some(([url]) => String(url).includes("/availability"))).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Consultar mesas livres" }));
    expect(await screen.findByText("Mesa 15")).toBeTruthy();
    const url = new URL(String(requests().find(([request]) => String(request).includes("/availability"))?.[0]));
    expect(Object.fromEntries(url.searchParams)).toEqual({ startsAt: reservationItem().reservation.startsAt, endsAt: reservationItem().reservation.endsAt, people: "3" });
  });

  it("handles empty availability and isolated retries", async () => {
    let fail = true;
    const { requests } = fixture({ availability: () => fail ? Response.json({ code: "TEMPORARY", message: "Disponibilidade indisponível" }, { status: 503 }) : Response.json([]) });
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Consultar mesas livres" }));
    await screen.findByText("Disponibilidade indisponível");
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Tentar consultar novamente" }));
    await screen.findByText("Nenhuma outra mesa livre nesse intervalo e capacidade.");
    expect(requests().filter(([url]) => String(url).includes("/availability"))).toHaveLength(2);
  });

  it.each(["OWNER", "STAFF"] as const)("allows %s to update a reservation status with CSRF", async (role) => {
    const { writes } = fixture({ memberships: [{ restaurantId: restaurantA, role }] });
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    await waitFor(() => expect(summary().getByText("Confirmada")).toBeTruthy());
    expect(writes()).toHaveLength(1);
    expect(String(writes()[0][0])).toContain(`/reservations/${reservationId}/status`);
    expect(writes()[0][1]?.body).toBe(JSON.stringify({ status: "CONFIRMED" }));
    expect(new Headers(writes()[0][1]?.headers).get("X-CSRF-Token")).toBe("reservations-csrf");
  });

  it("requires cancellation confirmation and uses the dedicated endpoint", async () => {
    const { writes } = fixture();
    await open();
    expect(screen.getByText(/A janela aparenta estar aberta/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar reserva" }));
    expect(writes()).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Voltar sem confirmar" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar reserva" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    await waitFor(() => expect(summary().getByText("Cancelada")).toBeTruthy());
    expect(String(writes()[0][0])).toContain(`/reservations/${reservationId}/cancel`);
    expect(writes()[0][1]?.body).toBeUndefined();
    expect(screen.getByText("Nenhuma ação disponível no estado atual.")).toBeTruthy();
  });

  it("disables cancellation when the device indicates the two-hour window ended", async () => {
    const item = reservationItem();
    item.reservation.startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    item.reservation.endsAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    fixture({ item });
    await open();
    expect(screen.getByText(/a janela está encerrada/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar reserva" }).hasAttribute("disabled")).toBe(true);
  });

  it("offers both allowed outcomes for CONFIRMED and no actions for terminal status", async () => {
    const item = reservationItem(); item.reservation.status = "CONFIRMED";
    fixture({ item }); await open();
    expect(screen.getByRole("button", { name: "Finalizar reserva" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Marcar ausência" })).toBeTruthy();
  });

  it("does not automatically retry domain failures", async () => {
    const { writes } = fixture({ mutation: () => Response.json({ code: "INVALID_RESERVATION_STATUS_TRANSITION", message: "A reserva mudou." }, { status: 409 }) });
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    await screen.findByText(/A reserva mudou/);
    await screen.findByRole("button", { name: "Confirmar reserva" });
    expect(writes()).toHaveLength(1);
  });

  it("shows uncertain mutation results and blocks duplicate clicks", async () => {
    let reject: (error: Error) => void = () => {};
    const { writes } = fixture({ mutation: () => new Promise<Response>((_, fail) => { reject = fail; }) });
    await open();
    const button = screen.getByRole("button", { name: "Confirmar reserva" });
    fireEvent.click(button); fireEvent.click(button);
    expect(writes()).toHaveLength(1);
    await act(async () => reject(new TypeError("network")));
    await screen.findByText(/Não foi possível confirmar o resultado/);
    expect(writes()).toHaveLength(1);
  });

  it("clears selection and filters and ignores an old detail after restaurant change", async () => {
    let resolve: (response: Response) => void = () => {};
    const { requests } = fixture({ memberships: [{ restaurantId: restaurantA, role: "OWNER" }, { restaurantId: restaurantB, role: "STAFF" }], detail: () => new Promise<Response>((done) => { resolve = done; }), list: (url) => { const item = reservationItem(); item.customer.name = url.pathname.includes(restaurantB) ? "Bruno Norte" : "Ana Silva"; return Response.json(listPayload(item)); } });
    await screen.findByText("Qual casa vamos acompanhar?");
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantA);
    await userEvent.selectOptions(screen.getByLabelText("Status"), "SCHEDULED");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
    await userEvent.click(await screen.findByRole("button", { name: /Abrir reserva/ }));
    await screen.findByText("Carregando detalhe e histórico…");
    const old = requests().find(([url, init]) => String(url).endsWith(reservationId) && init?.method === "GET");
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantB);
    await screen.findByText("Bruno Norte");
    expect(old?.[1]?.signal?.aborted).toBe(true);
    await act(async () => resolve(Response.json(reservationItem().reservation)));
    expect(screen.queryByRole("region", { name: "Resumo da reserva" })).toBeNull();
    expect(Object.fromEntries(new URL(String(requests().at(-1)?.[0])).searchParams)).toEqual({ page: "1", limit: "20" });
  });
});
