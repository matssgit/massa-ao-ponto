import type { Period } from "./schemas";

function formatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
}
function wallTime(date: Date, format: Intl.DateTimeFormat): number {
  const parts = format.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
}
export function zonedInstant(value: string, timeZone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Informe data e horário completos.");
  const wall = new Date(`${value}:00Z`);
  if (!Number.isFinite(wall.getTime()) || wall.toISOString().slice(0, 16) !== value) throw new Error("Informe uma data válida.");
  let format: Intl.DateTimeFormat;
  try { format = formatter(timeZone); } catch { throw new Error("O fuso informado pelo restaurante é inválido. Entre em contato com o restaurante."); }
  // Collect offsets on both sides of transitions; ambiguous/nonexistent wall times require another choice.
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const sample = new Date(wall.getTime() + hours * 3600000);
    offsets.add(wallTime(sample, format) - sample.getTime());
  }
  const candidates = [...offsets].map(offset => new Date(wall.getTime() - offset)).filter(date => wallTime(date, format) === wall.getTime());
  if (candidates.length !== 1) throw new Error("Este horário é inexistente ou ambíguo por uma mudança de fuso. Escolha outro horário.");
  return candidates[0].toISOString();
}
export function reservationPeriod(partySize: string, start: string, end: string, timeZone: string): Period {
  const people = Number(partySize);
  if (!Number.isInteger(people) || people < 1) throw new Error("Informe um número inteiro de pessoas maior que zero.");
  const startsAt = zonedInstant(start, timeZone);
  const endsAt = zonedInstant(end, timeZone);
  if (startsAt >= endsAt) throw new Error("O término deve ser depois do início.");
  return { partySize: people, startsAt, endsAt };
}
export function publicDate(value: string, timeZone: string): string {
  try { return new Intl.DateTimeFormat("pt-BR", { timeZone, dateStyle: "long", timeStyle: "short" }).format(new Date(value)); }
  catch { return `${value} (instante ISO; fuso do restaurante indisponível)`; }
}
