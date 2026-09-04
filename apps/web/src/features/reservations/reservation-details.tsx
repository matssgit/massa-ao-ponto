import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api-client";
import { ReservationActions } from "./reservation-actions";
import { ReservationAvailability } from "./reservation-availability";
import { ReservationHistory } from "./reservation-history";
import { peopleLabel, reservationDateTime, reservationStatusLabels } from "./reservation-labels";
import { ReservationsService, type ReservationAction, type ReservationListItem } from "./reservations-service";
import { useReservationsQuery } from "./use-reservations-query";

export function ReservationDetails({ service, restaurantId, selected, role, onBack, onChanged }: {
  service: ReservationsService; restaurantId: string; selected: ReservationListItem; role: "OWNER" | "STAFF";
  onBack: () => void; onChanged: () => void;
}) {
  const id = selected.reservation.id;
  const load = useCallback((signal: AbortSignal) => service.detail(restaurantId, id, signal), [service, restaurantId, id]);
  const { state, reload } = useReservationsQuery(`${restaurantId}:${id}`, load);
  const [availability, setAvailability] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const pending = useRef(false);
  const alive = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { alive.current = true; heading.current?.focus(); return () => { alive.current = false; }; }, []);

  async function act(action: ReservationAction) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setNotice(null);
    try {
      await service.mutate(restaurantId, id, action);
      if (alive.current) setNotice({ error: false, text: "Ação concluída. Atualizando a agenda pelo servidor." });
    } catch (error) {
      if (alive.current) {
        const uncertain = !(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.code === "INVALID_RESPONSE";
        setNotice({ error: true, text: uncertain ? "Não foi possível confirmar o resultado da ação. Confira os dados atualizados antes de tentar novamente." : `${error.message} (${error.code})` });
      }
    } finally {
      pending.current = false;
      if (alive.current) { setBusy(false); reload(); onChanged(); }
    }
  }

  return <section className="reservation-detail" aria-labelledby="reservation-detail-title">
    <header className="reservations-heading"><div><button className="secondary" disabled={busy} onClick={onBack}>Voltar à agenda</button><h2 ref={heading} tabIndex={-1} id="reservation-detail-title">Reserva #{id.slice(0, 8)}</h2><p className="reservation-id">{id}</p></div><button className="secondary" disabled={busy} onClick={reload}>Atualizar detalhe</button></header>
    {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "error" : "reservation-success"}>{notice.text}</p>}
    {state.status === "loading" && <p role="status">Carregando detalhe e histórico…</p>}
    {state.status === "error" && <div className="reservations-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={reload}>Tentar carregar detalhe novamente</button></div>}
    {state.status === "success" && <>
      <div className="reservation-detail-grid">
        <section className="reservation-panel" aria-label="Resumo da reserva"><h3>{selected.customer.name}</h3><p>{selected.customer.phone}{selected.customer.email ? ` · ${selected.customer.email}` : ""}</p>
          <dl className="reservation-facts">
            <div><dt>Status</dt><dd>{reservationStatusLabels[state.data.reservation.status]}</dd></div>
            <div><dt>Pessoas</dt><dd>{peopleLabel(state.data.reservation.people)}</dd></div>
            <div><dt>Início</dt><dd>{reservationDateTime(state.data.reservation.startsAt)}</dd></div>
            <div><dt>Término</dt><dd>{reservationDateTime(state.data.reservation.endsAt)}</dd></div>
            <div><dt>Mesa</dt><dd>{selected.table.number} · {selected.table.type}</dd></div>
            <div><dt>Capacidade</dt><dd>{selected.table.capacity}</dd></div>
          </dl>
          {state.data.reservation.observation && <p className="reservation-observation">Observação: {state.data.reservation.observation}</p>}
          <p className="reservation-clock-note">Horários apresentados no fuso do dispositivo: {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p>
        </section>
        <ReservationActions key={`${role}:${state.data.reservation.status}:${state.data.reservation.startsAt}`} reservation={state.data.reservation} busy={busy} onAction={(action) => void act(action)} />
      </div>
      <div className="reservation-secondary-actions"><button className="secondary" onClick={() => setAvailability((current) => !current)} aria-expanded={availability}>{availability ? "Ocultar mesas livres" : "Consultar mesas livres"}</button></div>
      {availability && <ReservationAvailability service={service} restaurantId={restaurantId} reservation={state.data.reservation} />}
      <ReservationHistory entries={state.data.history} />
    </>}
  </section>;
}
