import { reservationDateTime, reservationStatusLabels } from "./reservation-labels";
import { reservationStatusSchema, type ReservationHistoryEntry } from "./reservations-service";

function status(value: string) {
  const result = reservationStatusSchema.safeParse(value);
  return result.success ? reservationStatusLabels[result.data] : value;
}
export function ReservationHistory({ entries }: { entries: ReservationHistoryEntry[] }) {
  return <section className="reservation-history" aria-label="Histórico da reserva"><h3>Histórico da reserva</h3>
    {entries.length === 0 ? <p className="muted">Nenhum evento registrado.</p> : <ol>{entries.map((entry) => <li key={entry.id}>
      <strong>{entry.action === "CREATED" ? "Reserva criada" : entry.action === "STATUS_CHANGED" ? "Status alterado" : entry.action}</strong>
      <time dateTime={entry.createdAt}>{reservationDateTime(entry.createdAt)}</time>
      <p>{entry.previousStatus ? `${status(entry.previousStatus)} → ` : ""}{status(entry.newStatus)}</p>
      {entry.observation && <p className="muted">{entry.observation}</p>}
    </li>)}</ol>}
  </section>;
}
