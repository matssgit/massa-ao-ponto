import { peopleLabel, reservationDateTime, reservationStatusLabels } from "./reservation-labels";
import type { ReservationListItem, ReservationsList as ListResult } from "./reservations-service";
import { Pagination } from "../../components/pagination";

export function ReservationsList({ result, onSelect, onPage }: { result: ListResult; onSelect: (item: ReservationListItem) => void; onPage: (page: number) => void }) {
  const { data, meta } = result;
  return <>
    <p className="reservations-count">{meta.total} reservas encontradas · Horário inicial crescente</p>
    {data.length === 0 ? <p className="reservations-feedback" role="status">Nenhuma reserva nesta página para os filtros aplicados.</p> : <table className="reservations-table" aria-label="Agenda de reservas">
      <thead><tr><th>Cliente / reserva</th><th>Mesa</th><th>Pessoas</th><th>Status</th><th>Início</th><th>Término</th><th>Ações</th></tr></thead>
      <tbody>{data.map((item) => <tr key={item.reservation.id}>
        <th scope="row"><strong>{item.customer.name}</strong><span className="reservation-id">#{item.reservation.id.slice(0, 8)}</span></th>
        <td data-label="Mesa"><strong>{item.table.number}</strong><span className="reservation-meta">{item.table.type} · até {item.table.capacity}</span></td>
        <td data-label="Pessoas">{peopleLabel(item.reservation.people)}</td>
        <td data-label="Status"><span className={`reservation-status reservation-status-${item.reservation.status.toLowerCase()}`}>{reservationStatusLabels[item.reservation.status]}</span></td>
        <td data-label="Início"><time dateTime={item.reservation.startsAt}>{reservationDateTime(item.reservation.startsAt)}</time></td>
        <td data-label="Término"><time dateTime={item.reservation.endsAt}>{reservationDateTime(item.reservation.endsAt)}</time></td>
        <td><button className="secondary" onClick={() => onSelect(item)} aria-label={`Abrir reserva ${item.reservation.id.slice(0, 8)} de ${item.customer.name}`}>Abrir reserva</button></td>
      </tr>)}</tbody>
    </table>}
    <Pagination meta={meta} onPage={onPage} className="reservations-pagination" label="Paginação de reservas" />
  </>;
}
