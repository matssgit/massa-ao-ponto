import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError } from "../../lib/api-client";
import { publicDate, reservationPeriod } from "./dates";
import { customerFormSchema, type AvailableTable, type Period, type PublicRestaurant } from "./schemas";
import { PublicReservationService } from "./service";
import { ErrorNotice, PublicFrame, PublicMissing, usePublicQuery } from "./shared";

export function PublicReservationPage({ service, slug }: { service: PublicReservationService; slug: string }) {
  const query = usePublicQuery(useCallback((signal: AbortSignal) => service.restaurant(slug, signal), [service, slug]));
  return <PublicFrame slug={slug}>{query.loading ? <p role="status">Carregando restaurante…</p> : query.error ? query.error instanceof ApiError && query.error.status === 404 ? <PublicMissing /> : <ErrorNotice error={query.error} retry={query.reload} /> : query.data && <ReservationForm service={service} slug={slug} restaurant={query.data} />}</PublicFrame>;
}
function ReservationForm({ service, slug, restaurant }: { service: PublicReservationService; slug: string; restaurant: PublicRestaurant }) {
  const navigate = useNavigate();
  const [people, setPeople] = useState("2");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [period, setPeriod] = useState<Period>();
  const [tables, setTables] = useState<AvailableTable[]>();
  const [tableId, setTableId] = useState("");
  const [checking, setChecking] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<unknown>();
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", notes: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const alive = useRef(true);
  const request = useRef<AbortController | null>(null);
  const summary = useRef<HTMLHeadingElement>(null);
  const [review, setReview] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); }; }, []);
  useEffect(() => { if (review) summary.current?.focus(); }, [review]);
  function invalidate() {
    request.current?.abort(); setChecking(false); setTables(undefined); setPeriod(undefined); setTableId(""); setReview(false); setError(undefined); setAvailabilityError(undefined);
  }
  async function check(event?: FormEvent) {
    event?.preventDefault();
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setAvailabilityError(undefined); setTableId(""); setTables(undefined); setReview(false);
    try {
      const next = reservationPeriod(people, start, end, restaurant.timezone);
      setPeriod(next); setChecking(true);
      const result = await service.availability(slug, next, controller.signal);
      if (!controller.signal.aborted) setTables(result);
    } catch (cause) { if (!controller.signal.aborted) setAvailabilityError(cause); }
    finally { if (!controller.signal.aborted) setChecking(false); }
  }
  function prepare(event: FormEvent) {
    event.preventDefault();
    const parsed = customerFormSchema.safeParse(customer);
    const issues: Record<string, string> = {};
    if (!parsed.success) for (const issue of parsed.error.issues) issues[String(issue.path[0])] = issue.message;
    setFieldErrors(issues);
    if (!parsed.success) { setError(new Error("Revise os campos indicados antes de continuar.")); return; }
    if (!period || !tableId || !tables?.some(table => table.id === tableId)) return;
    setError(undefined); setReview(true);
  }
  async function submit() {
    if (submitting.current || !period || !tableId) return;
    const parsed = customerFormSchema.safeParse(customer);
    if (!parsed.success) return;
    submitting.current = true; setBusy(true); setError(undefined);
    const { name, phone, email, notes } = parsed.data;
    try {
      const result = await service.create(slug, { ...period, tableId, customer: { name, phone, ...(email ? { email } : {}) }, ...(notes ? { notes } : {}) });
      if (alive.current) navigate(`/reserva/${encodeURIComponent(result.accessToken)}`, { replace: true });
    } catch (cause) {
      if (alive.current) {
        setError(cause);
        if (cause instanceof ApiError && cause.status === 409) { setReview(false); setTableId(""); setTables(undefined); }
      }
    } finally { submitting.current = false; if (alive.current) setBusy(false); }
  }
  const selected = tables?.find(table => table.id === tableId);
  return <><Link className="public-back" to={`/r/${encodeURIComponent(slug)}`}>← {restaurant.name}</Link><div className="public-page-title"><p className="public-eyebrow">Planeje seu encontro</p><h1>Uma mesa para vocês.</h1><p>Escolha o período, encontre sua mesa e reserve.</p></div><div className="public-booking-grid"><div>
    <section className="public-card"><h2><span className="public-step">01</span> Quando vamos nos encontrar?</h2><p id="timezone-hint">Horários em <strong>{restaurant.timezone}</strong>, o fuso do restaurante. Escolha início e término; não há duração automática.</p><form onSubmit={event => void check(event)}><fieldset disabled={busy}><div className="public-fields"><label htmlFor="party-size">Pessoas<input id="party-size" type="number" min="1" step="1" required value={people} onChange={event => { invalidate(); setPeople(event.target.value); }} /></label><label htmlFor="starts-at">Início<input id="starts-at" type="datetime-local" required aria-describedby="timezone-hint" value={start} onChange={event => { invalidate(); setStart(event.target.value); }} /></label><label htmlFor="ends-at">Término<input id="ends-at" type="datetime-local" required aria-describedby="timezone-hint" value={end} onChange={event => { invalidate(); setEnd(event.target.value); }} /></label></div><button className="public-primary" disabled={checking}>{checking ? "Consultando…" : "Ver mesas disponíveis"}</button></fieldset></form></section>
    <section className="public-card" aria-busy={checking}><h2><span className="public-step">02</span> Escolha seu lugar</h2>{checking && <p role="status">Consultando disponibilidade…</p>}{availabilityError !== undefined && <ErrorNotice error={availabilityError} retry={() => void check()} />}{!checking && tables === undefined && availabilityError === undefined && <p>Informe o período para consultar as mesas.</p>}{tables?.length === 0 && <p role="status">Nenhuma mesa disponível nesse período. Experimente outro horário ou número de pessoas.</p>}{tables && tables.length > 0 && <fieldset className="public-table-options" disabled={busy}><legend>Mesas disponíveis para {people} pessoas</legend>{tables.map(table => <label key={table.id} className={tableId === table.id ? "public-table-option selected" : "public-table-option"}><input type="radio" name="table" value={table.id} checked={tableId === table.id} onChange={() => { setTableId(table.id); setReview(false); }} /><span><strong>{table.type === "room" ? "Sala" : "Mesa"} {table.number}</strong><small>Até {table.capacity} pessoas</small></span></label>)}</fieldset>}</section>
    {selected && <section className="public-card"><h2><span className="public-step">03</span> Quem vem nos visitar?</h2><form onSubmit={prepare} noValidate><fieldset disabled={busy}><div className="public-fields">{([['name', 'Nome'], ['phone', 'Telefone com DDD'], ['email', 'E-mail (opcional)']] as const).map(([key, label]) => <div key={key}><label htmlFor={`customer-${key}`}>{label}<input id={`customer-${key}`} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} autoComplete={key === "phone" ? "tel" : key} value={customer[key]} aria-invalid={!!fieldErrors[key]} aria-describedby={fieldErrors[key] ? `error-${key}` : undefined} onChange={event => { setCustomer({ ...customer, [key]: event.target.value }); setReview(false); }} /></label>{fieldErrors[key] && <small id={`error-${key}`} className="public-field-error">{fieldErrors[key]}</small>}</div>)}</div><label htmlFor="customer-notes">Observação (opcional)<textarea id="customer-notes" rows={3} value={customer.notes} onChange={event => { setCustomer({ ...customer, notes: event.target.value }); setReview(false); }} /></label><button className="public-primary">Revisar reserva</button></fieldset></form></section>}
    {error !== undefined && <><ErrorNotice error={error} />{error instanceof ApiError && (error.status === 0 || error.status >= 500 || error.code === "INVALID_RESPONSE") && <p>Não foi possível confirmar o resultado. A reserva pode ter sido criada. Antes de repetir, entre em contato com o restaurante.</p>}</>}
    {review && period && selected && <section className="public-card public-review"><h2 ref={summary} tabIndex={-1}><span className="public-step">04</span> Está tudo certo?</h2><p>{customer.name}, sua reserva será em <strong>{restaurant.name}</strong>.</p><p>{period.partySize} pessoas · {selected.type === "room" ? "Sala" : "Mesa"} {selected.number}</p><p>{publicDate(period.startsAt, restaurant.timezone)}<br />até {publicDate(period.endsAt, restaurant.timezone)}</p><p>Fuso: {restaurant.timezone}</p><button className="public-primary" disabled={busy} onClick={() => void submit()}>{busy ? "Reservando…" : "Confirmar reserva"}</button></section>}
    </div><aside className="public-aside"><p className="public-eyebrow">Sua visita</p><h2>{restaurant.name}</h2><p>{restaurant.address}</p>{restaurant.phone && <p>{restaurant.phone}</p>}<hr /><p>Após reservar, você receberá um link para consultar ou cancelar sua reserva. Guarde-o com cuidado.</p><p>O cancelamento exige mais de duas horas de antecedência.</p></aside></div></>;
}
