export type Preset = "today" | "7days" | "30days";
export interface DashboardPeriod { startsAt: string; endsAt: string }

export function presetPeriod(preset: Preset, now = new Date()): DashboardPeriod {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (preset === "7days" ? 6 : preset === "30days" ? 29 : 0));
  return { startsAt: start.toISOString(), endsAt: now.toISOString() };
}

function localDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Informe as duas datas do período.");
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime()) || dateInput(date) !== value) throw new Error("Informe datas válidas.");
  return date;
}

export function customPeriod(start: string, end: string): DashboardPeriod {
  const startsAt = localDate(start);
  const endsAt = localDate(end);
  if (startsAt > endsAt) throw new Error("A data inicial deve ser anterior ou igual à final.");
  endsAt.setHours(23, 59, 59, 999);
  return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
}

export function dateInput(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export const formatMoney = (cents: number): string => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
export const formatCount = (value: number): string => new Intl.NumberFormat("pt-BR").format(value);
export const formatPeriodDate = (value: string): string => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
