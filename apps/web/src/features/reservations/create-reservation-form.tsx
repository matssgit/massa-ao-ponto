import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import type { ApiClient } from "../../lib/api-client";
import { ApiError } from "../../lib/api-client";
import { CustomerFields, type CustomerDraft } from "../admin-creation/customer-fields";
import { reservationPeriod } from "../public-reservations/dates";
import { RestaurantSettingsService, type RestaurantDetails } from "../restaurant-settings/restaurant-settings-service";
import { createReservationInputSchema, type AvailableTable, type CreateReservationInput, type ReservationListItem, type ReservationsService } from "./reservations-service";
import "../admin-creation/admin-creation.css";

const emptyCustomer: CustomerDraft = { name: "", phone: "", email: "" };
function message(cause: unknown) {
  if (cause instanceof z.ZodError) return cause.issues[0]?.message ?? "Revise os dados da reserva.";
  return cause instanceof Error ? cause.message : "Não foi possível criar a reserva.";
}
function uncertain(cause: unknown) {
  return cause instanceof ApiError && (cause.status === 0 || cause.status >= 500 || cause.code === "INVALID_RESPONSE");
}

export function CreateReservationForm({ client, service, restaurantId, onCancel, onCreated, onUncertain }: {
  client: ApiClient;
  service: ReservationsService;
  restaurantId: string;
  onCancel: () => void;
  onCreated: (item: ReservationListItem) => void;
  onUncertain: () => void;
}) {
  const restaurants = useMemo(() => new RestaurantSettingsService(client), [client]);
  const [restaurant, setRestaurant] = useState<RestaurantDetails>();
  const [loadError, setLoadError] = useState<string>();
  const [reload, setReload] = useState(0);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [people, setPeople] = useState("2");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [observation, setObservation] = useState("");
  const [tables, setTables] = useState<AvailableTable[]>();
  const [tableId, setTableId] = useState("");
  const [draft, setDraft] = useState<CreateReservationInput>();
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isUncertain, setIsUncertain] = useState(false);
  const [error, setError] = useState<string>();
  const availabilityController = useRef<AbortController | undefined>(undefined);
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setRestaurant(undefined); setLoadError(undefined);
    void restaurants.get(restaurantId, controller.signal).then((value) => { if (!controller.signal.aborted) setRestaurant(value); }).catch((cause: unknown) => { if (!controller.signal.aborted) setLoadError(message(cause)); });
    return () => { controller.abort(); availabilityController.current?.abort(); };
  }, [restaurantId, restaurants, reload]);

  function invalidate() {
    availabilityController.current?.abort();
    setTables(undefined); setTableId(""); setDraft(undefined); setError(undefined);
  }

  async function check(event: FormEvent) {
    event.preventDefault();
    if (!restaurant || checking) return;
    try {
      const period = reservationPeriod(people, start, end, restaurant.timezone);
      const controller = new AbortController(); availabilityController.current?.abort(); availabilityController.current = controller;
      setChecking(true); setError(undefined); setTables(undefined); setTableId("");
      const result = await service.availability(restaurantId, { startsAt: period.startsAt, endsAt: period.endsAt, people: period.partySize }, controller.signal);
      if (!controller.signal.aborted) setTables(result);
    } catch (cause) { setError(message(cause)); }
    finally { setChecking(false); }
  }

  function review() {
    if (!restaurant) return;
    try {
      const period = reservationPeriod(people, start, end, restaurant.timezone);
      setDraft(createReservationInputSchema.parse({
        tableId,
        customer: { name: customer.name, phone: customer.phone, ...(customer.email.trim() ? { email: customer.email } : {}) },
        people: period.partySize, startsAt: period.startsAt, endsAt: period.endsAt,
        observation: observation.trim() || null,
      }));
      setError(undefined);
    } catch (cause) { setError(message(cause)); }
  }

  async function submit() {
    if (!draft || submitting.current || isUncertain) return;
    const table = tables?.find((item) => item.id === draft.tableId);
    if (!table) return;
    submitting.current = true; setBusy(true); setError(undefined);
    try {
      const reservation = await service.create(restaurantId, draft);
      onCreated({ reservation, customer: { id: reservation.customerId, name: draft.customer.name, phone: draft.customer.phone, email: draft.customer.email ?? null }, table });
    } catch (cause) {
      setError(message(cause));
      if (uncertain(cause)) setIsUncertain(true);
    } finally { submitting.current = false; setBusy(false); }
  }

  if (!restaurant) return <section className="admin-create-panel" aria-label="Nova reserva">{loadError ? <><p role="alert">{loadError}</p><button className="secondary" onClick={() => setReload((value) => value + 1)}>Tentar carregar formulário novamente</button><button className="secondary" onClick={onCancel}>Fechar</button></> : <p role="status">Preparando formulário da reserva…</p>}</section>;

  const selected = tables?.find((table) => table.id === tableId);
  return <section className="admin-create-panel" aria-label="Nova reserva"><header><div><p className="eyebrow">ATENDIMENTO MANUAL</p><h2>{draft ? "Revisar reserva" : "Nova reserva"}</h2></div><button className="secondary" disabled={busy} onClick={onCancel}>Fechar</button></header>
    {!draft ? <><form onSubmit={(event) => void check(event)}>
      <fieldset disabled={checking || busy} className="admin-create-fields"><legend>Agenda</legend><label>Pessoas<input required type="number" min="1" step="1" value={people} onChange={(event) => { setPeople(event.target.value); invalidate(); }} /></label><label>Início<input required type="datetime-local" aria-describedby="admin-reservation-timezone" value={start} onChange={(event) => { setStart(event.target.value); invalidate(); }} /></label><label>Término<input required type="datetime-local" aria-describedby="admin-reservation-timezone" value={end} onChange={(event) => { setEnd(event.target.value); invalidate(); }} /></label></fieldset>
      <p id="admin-reservation-timezone" className="muted">Horários em <strong>{restaurant.timezone}</strong>. O período é convertido para um instante sem alterar o horário informado.</p>
      <CustomerFields idPrefix="reservation-customer" value={customer} disabled={checking || busy} onChange={(value) => { setCustomer(value); setDraft(undefined); }} />
      <label className="admin-create-wide">Observação<textarea value={observation} onChange={(event) => setObservation(event.target.value)} /></label>
      {error && <p className="error" role="alert">{error}</p>}<button className="secondary" disabled={checking} type="submit">{checking ? "Consultando…" : "Consultar disponibilidade"}</button>
    </form>
    {tables && <section className="admin-create-availability" aria-label="Mesas disponíveis"><h3>Mesas disponíveis</h3>{tables.length === 0 ? <p>Nenhuma mesa atende ao período e capacidade informados.</p> : <fieldset><legend>Escolha uma mesa</legend>{tables.map((table) => <label key={table.id}><input type="radio" name="reservation-table" checked={tableId === table.id} onChange={() => setTableId(table.id)} /><span><strong>{table.type === "room" ? "Sala" : "Mesa"} {table.number}</strong><small>Capacidade {table.capacity}</small></span></label>)}</fieldset>}{tableId && <button className="primary" onClick={review}>Revisar reserva</button>}</section>}
    </> : <div className="admin-create-review"><p><strong>{draft.customer.name}</strong> · {draft.people} pessoas</p><p>{start} até {end}<br />Fuso: {restaurant.timezone}</p><p>{selected?.type === "room" ? "Sala" : "Mesa"} {selected?.number} · capacidade {selected?.capacity}</p>{draft.observation && <p>Observação: {draft.observation}</p>}<p className="muted">A disponibilidade será validada novamente pelo servidor ao criar a reserva.</p>
      {error && <p className="error" role="alert">{error}</p>}{isUncertain ? <div className="admin-create-uncertain"><p>Não foi possível confirmar o resultado. Atualize a agenda antes de tentar novamente para evitar duplicidade.</p><button className="secondary" onClick={onUncertain}>Voltar e atualizar agenda</button></div> : <div className="admin-create-actions"><button className="secondary" disabled={busy} onClick={() => setDraft(undefined)}>Voltar e editar</button><button className="primary" disabled={busy} onClick={() => void submit()}>{busy ? "Criando reserva…" : "Confirmar reserva"}</button></div>}
    </div>}
  </section>;
}
