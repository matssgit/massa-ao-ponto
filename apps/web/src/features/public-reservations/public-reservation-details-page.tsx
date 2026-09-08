import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api-client";
import { publicDate } from "./dates";
import { PublicReservationService } from "./service";
import { ErrorNotice, PublicFrame, PublicMissing, statusLabels, usePublicQuery } from "./shared";
export function PublicReservationDetailsPage({ service, token }: { service: PublicReservationService; token: string }) {
  const query = usePublicQuery(useCallback((signal: AbortSignal) => service.lookup(token, signal), [service, token]));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState(false);
  const submitting = useRef(false);
  const alive = useRef(true);
  const action = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const notice = useRef<HTMLParagraphElement>(null);
  const wasConfirming = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (confirm) dialog.current?.focus();
    else if (wasConfirming.current) action.current?.focus();
    wasConfirming.current = confirm;
  }, [confirm]);
  useEffect(() => { if (success && !query.loading) notice.current?.focus(); }, [success, query.loading]);
  async function cancel() {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(undefined);
    try { await service.cancel(token); if (alive.current) setSuccess(true); }
    catch (cause) { if (alive.current) setError(cause); }
    finally {
      submitting.current = false;
      if (alive.current) { setBusy(false); setConfirm(false); query.reload(); }
    }
  }
  const invalid = query.error instanceof ApiError && [400, 404].includes(query.error.status);
  const data = query.data;
  return <PublicFrame slug={data?.restaurant.slug}>{query.loading ? <p role="status">Consultando sua reserva…</p> : invalid ? <PublicMissing reservation /> : query.error ? <ErrorNotice error={query.error} retry={query.reload} /> : data && <div className="public-detail"><p className="public-eyebrow">Seu próximo encontro</p><h1>Sua reserva</h1><p className="public-status">{statusLabels[data.reservation.status]}</p><p>Guarde este link em um lugar seguro. Quem tiver acesso a ele poderá consultar e solicitar o cancelamento.</p><section className="public-card"><h2>{data.restaurant.name}</h2><p>{data.restaurant.address}</p>{data.restaurant.phone && <p>{data.restaurant.phone}</p>}<dl className="public-detail-list"><div><dt>{data.table.type === "room" ? "Sala" : "Mesa"}</dt><dd>{data.table.number} · até {data.table.capacity} pessoas</dd></div><div><dt>Pessoas</dt><dd>{data.reservation.partySize}</dd></div><div><dt>Início</dt><dd>{publicDate(data.reservation.startsAt, data.restaurant.timezone)}</dd></div><div><dt>Término</dt><dd>{publicDate(data.reservation.endsAt, data.restaurant.timezone)}</dd></div><div><dt>Fuso do restaurante</dt><dd>{data.restaurant.timezone}</dd></div>{data.reservation.notes && <div><dt>Observação</dt><dd className="public-notes">{data.reservation.notes}</dd></div>}</dl></section>{["SCHEDULED", "CONFIRMED"].includes(data.reservation.status) && <section className="public-card"><h2>Os planos mudaram?</h2><p>Você pode solicitar o cancelamento com mais de duas horas de antecedência. O restaurante valida o horário e o estado atual da reserva.</p><button className="public-secondary" ref={action} disabled={busy || confirm} onClick={() => setConfirm(true)}>Cancelar reserva</button></section>}</div>}
    {success && !query.loading && <p className="public-success" role="status" ref={notice} tabIndex={-1}>Reserva cancelada. Este mesmo link continua disponível para consulta.</p>}
    {error !== undefined && <ErrorNotice error={error instanceof ApiError && [400, 404].includes(error.status) ? new Error("Reserva não encontrada ou link inválido.") : error} />}
    {confirm && <div className="public-confirm-backdrop"><div className="public-card public-confirm" role="alertdialog" aria-modal="true" aria-labelledby="cancel-title" aria-describedby="cancel-description" tabIndex={-1} ref={dialog} onKeyDown={event => {
      if (event.key === "Escape" && !busy) { setConfirm(false); action.current?.focus(); }
      if (event.key === "Tab") {
        const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        if (!buttons?.length) { event.preventDefault(); return; }
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}><h2 id="cancel-title">Cancelar esta reserva?</h2><p id="cancel-description">Sua mesa será liberada. Esta ação não pode ser desfeita.</p><div className="public-confirm-actions"><button className="public-secondary" disabled={busy} onClick={() => { setConfirm(false); action.current?.focus(); }}>Manter reserva</button><button className="public-primary" disabled={busy} onClick={() => void cancel()}>{busy ? "Cancelando…" : "Sim, cancelar reserva"}</button></div></div></div>}
  </PublicFrame>;
}
