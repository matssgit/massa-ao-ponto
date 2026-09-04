import { useState, type FormEvent } from "react";
import { overlapPeriod, reservationStatusLabels } from "./reservation-labels";
import { reservationStatusSchema, type ReservationFiltersValue } from "./reservations-service";

export function ReservationsFilters({ onApply }: { onApply: (filters: ReservationFiltersValue) => void }) {
  const [status, setStatus] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState<string | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      onApply({ page: 1, limit, ...overlapPeriod(start, end), status: status ? reservationStatusSchema.parse(status) : undefined });
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Período inválido."); }
  }
  function clear() {
    setStatus(""); setStart(""); setEnd(""); setLimit(20); setError(null);
    onApply({ page: 1, limit: 20 });
  }
  return <form className="reservations-filters" aria-label="Filtros de reservas" onSubmit={submit}>
    <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos os status</option>{reservationStatusSchema.options.map((value) => <option key={value} value={value}>{reservationStatusLabels[value]}</option>)}</select></label>
    <label>Agenda de<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label>
    <label>Até<input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
    <label>Por página<select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>{[20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    <button className="primary" type="submit">Aplicar filtros</button>
    <button className="secondary" type="button" onClick={clear}>Limpar</button>
    <p className="reservations-filter-note">Inclui reservas que se sobrepõem ao período, sem incluir as que terminam exatamente no início ou começam exatamente no fim. O último dia termina à meia-noite seguinte. Fuso do dispositivo: {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p>
    {error && <p className="error" role="alert">{error}</p>}
  </form>;
}
