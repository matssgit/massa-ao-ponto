import { z } from "zod";

const localTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const operatingDaySchema = z.discriminatedUnion("active", [
  z.object({ dayOfWeek: z.number().int().min(0).max(6), active: z.literal(true), opensAt: localTime, closesAt: localTime }).strict(),
  z.object({ dayOfWeek: z.number().int().min(0).max(6), active: z.literal(false), opensAt: z.null(), closesAt: z.null() }).strict(),
]);
export const operatingHoursSchema = z.object({ configured: z.boolean(), days: z.array(operatingDaySchema).length(7) }).strict();
export type OperatingHours = z.infer<typeof operatingHoursSchema>;
export type OperatingDay = z.infer<typeof operatingDaySchema>;
export type OperationalOverride = "DEFAULT" | "OPEN" | "CLOSED";

export const weekdayLabels = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"] as const;
const weekdayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function localParts(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
  return { dayOfWeek: weekdayIndex[value("weekday")], date: `${value("year")}-${value("month")}-${value("day")}`, minutes: Number(value("hour")) * 60 + Number(value("minute")) };
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function isRestaurantOpenAt(hours: OperatingHours, timezone: string, instant = new Date(), override: OperationalOverride = "DEFAULT") {
  if (override === "OPEN") return true;
  if (override === "CLOSED") return false;
  if (!hours.configured) return true;
  const local = localParts(instant, timezone);
  const day = hours.days.find(entry => entry.dayOfWeek === local.dayOfWeek);
  return Boolean(day?.active && local.minutes >= minutes(day.opensAt) && local.minutes < minutes(day.closesAt));
}

export function isReservationWithinOperatingHours(hours: OperatingHours, timezone: string, startsAt: string, endsAt: string, override: OperationalOverride = "DEFAULT") {
  if (override === "OPEN") return true;
  if (override === "CLOSED") return false;
  if (!hours.configured) return true;
  const start = localParts(new Date(startsAt), timezone);
  const end = localParts(new Date(endsAt), timezone);
  if (start.date !== end.date || start.dayOfWeek !== end.dayOfWeek) return false;
  const day = hours.days.find(entry => entry.dayOfWeek === start.dayOfWeek);
  return Boolean(day?.active && start.minutes >= minutes(day.opensAt) && end.minutes <= minutes(day.closesAt));
}

export function emptyOperatingWeek(): OperatingDay[] {
  return weekdayLabels.map((_, dayOfWeek) => ({ dayOfWeek, active: false, opensAt: null, closesAt: null }));
}
