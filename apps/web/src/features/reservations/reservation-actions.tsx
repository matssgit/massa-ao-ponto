import { useState } from "react";
import { cancellationWindow } from "./reservation-labels";
import type { Reservation, ReservationAction, ReservationStatus } from "./reservations-service";

export function availableReservationActions(reservation: Reservation, now = new Date()) {
  const actions: { label: string; action: ReservationAction; disabled?: boolean }[] = [];
  const transitions: Partial<Record<ReservationStatus, { label: string; status: ReservationStatus }[]>> = {
    SCHEDULED: [{ label: "Confirmar reserva", status: "CONFIRMED" }],
    CONFIRMED: [{ label: "Finalizar reserva", status: "FINISHED" }, { label: "Marcar ausência", status: "NO_SHOW" }],
  };
  for (const transition of transitions[reservation.status] ?? []) actions.push({ label: transition.label, action: { kind: "status", status: transition.status } });
  if (reservation.status === "SCHEDULED" || reservation.status === "CONFIRMED") {
    actions.push({ label: "Cancelar reserva", action: { kind: "cancel" }, disabled: !cancellationWindow(reservation.startsAt, now).open });
  }
  return actions;
}

export function ReservationActions({ reservation, busy, onAction }: { reservation: Reservation; busy: boolean; onAction: (action: ReservationAction) => void }) {
  const [confirmation, setConfirmation] = useState<ReservationAction | null>(null);
  const actions = availableReservationActions(reservation);
  const cancellation = cancellationWindow(reservation.startsAt);
  const currentConfirmation = confirmation && actions.some(({ action, disabled }) => action.kind === confirmation.kind && !disabled) ? confirmation : null;
  return <section className="reservation-actions" aria-label="Ações da reserva" aria-busy={busy}><h3>Operar reserva</h3>
    {(reservation.status === "SCHEDULED" || reservation.status === "CONFIRMED") && <p className="muted">Cancelamento permitido pelo servidor somente com mais de 2 horas de antecedência. {cancellation.open ? "A janela aparenta estar aberta." : "Pelo relógio deste dispositivo, a janela está encerrada."}</p>}
    <div className="reservation-action-buttons">{actions.map(({ label, action, disabled }) => <button key={action.kind === "status" ? action.status : action.kind} className={action.kind === "status" ? "primary" : "secondary"} disabled={busy || disabled || currentConfirmation !== null} onClick={() => action.kind === "cancel" ? setConfirmation(action) : onAction(action)}>{label}</button>)}</div>
    {actions.length === 0 && <p>Nenhuma ação disponível no estado atual.</p>}
    {currentConfirmation && <div className="reservation-confirmation" role="alertdialog" aria-label="Confirmação do cancelamento"><p>Confirma o cancelamento? O servidor verificará novamente status e antecedência antes de alterar a reserva.</p><button className="primary" disabled={busy} onClick={() => onAction(currentConfirmation)} autoFocus>Confirmar cancelamento</button><button className="secondary" disabled={busy} onClick={() => setConfirmation(null)}>Voltar sem confirmar</button></div>}
    {busy && <p role="status">Enviando ação…</p>}
  </section>;
}
