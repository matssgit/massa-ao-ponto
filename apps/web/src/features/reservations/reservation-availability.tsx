import { useCallback } from "react";
import { peopleLabel } from "./reservation-labels";
import { ReservationsService, type Reservation } from "./reservations-service";
import { useReservationsQuery } from "./use-reservations-query";

export function ReservationAvailability({ service, restaurantId, reservation }: { service: ReservationsService; restaurantId: string; reservation: Reservation }) {
  const load = useCallback((signal: AbortSignal) => service.availability(restaurantId, reservation, signal), [service, restaurantId, reservation]);
  const { state, reload } = useReservationsQuery(`${restaurantId}:${reservation.id}:availability`, load);
  return <section className="reservation-availability" aria-label="Mesas disponíveis no intervalo"><h3>Mesas livres no mesmo intervalo</h3>
    <p className="muted">Mesas ativas para outro agendamento de {peopleLabel(reservation.people)}. A mesa desta reserva pode não aparecer enquanto ela estiver ativa.</p>
    {state.status === "loading" && <p role="status">Consultando disponibilidade…</p>}
    {state.status === "error" && <div><p role="alert">{state.message}</p><button className="secondary" onClick={reload}>Tentar consultar novamente</button></div>}
    {state.status === "success" && (state.data.length === 0 ? <p>Nenhuma outra mesa livre nesse intervalo e capacidade.</p> : <ul>{state.data.map((table) => <li key={table.id}><strong>Mesa {table.number}</strong><span>{table.type} · capacidade {table.capacity}</span></li>)}</ul>)}
  </section>;
}
