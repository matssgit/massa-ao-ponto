import type { ReservationStatus } from "./reservations-service";

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  SCHEDULED: "Agendada", CONFIRMED: "Confirmada", CANCELLED: "Cancelada", FINISHED: "Finalizada", NO_SHOW: "Não compareceu",
};
export const reservationDateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
export const peopleLabel = (people: number) => `${people} ${people === 1 ? "pessoa" : "pessoas"}`;

function localDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Informe datas válidas para o período.");
  const date = new Date(`${value}T00:00:00`);
  const roundtrip = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  if (Number.isNaN(date.getTime()) || roundtrip !== value) throw new Error("Informe datas válidas para o período.");
  return date;
}
export function overlapPeriod(start: string, end: string): { startsAt?: string; endsAt?: string } {
  const startsAt = start ? localDate(start) : undefined;
  const endsAt = end ? localDate(end) : undefined;
  if (endsAt) endsAt.setDate(endsAt.getDate() + 1);
  if (startsAt && endsAt && startsAt >= endsAt) throw new Error("A data inicial deve ser anterior ou igual à final.");
  return { startsAt: startsAt?.toISOString(), endsAt: endsAt?.toISOString() };
}
export function cancellationWindow(startsAt: string, now = new Date()) {
  const remainingMs = new Date(startsAt).getTime() - now.getTime();
  return { open: remainingMs > 2 * 60 * 60 * 1000, remainingMs };
}
