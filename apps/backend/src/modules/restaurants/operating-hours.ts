import type { OperatingHour, OperatingHourInput } from "./repositories/operating-hours-repository.js";
import type { OperationalOverride } from "./repositories/restaurants-repository.js";

export const weekDays = [0, 1, 2, 3, 4, 5, 6] as const;
const weekdayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function localParts(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { dayOfWeek: weekdayIndex[value("weekday")], date: `${value("year")}-${value("month")}-${value("day")}`, minutes: Number(value("hour")) * 60 + Number(value("minute")) };
}

function timeMinutes(value: string) {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

export function defaultOperatingWeek(): OperatingHourInput[] {
  return weekDays.map((dayOfWeek) => ({ dayOfWeek, active: false, opensAt: null, closesAt: null }));
}

export function operatingHoursView(hours: OperatingHour[]) {
  const byDay = new Map(hours.map((hour) => [hour.dayOfWeek, hour]));
  return {
    configured: hours.length > 0,
    days: weekDays.map((dayOfWeek) => {
      const hour = byDay.get(dayOfWeek);
      return { dayOfWeek, active: hour?.active ?? false, opensAt: hour?.opensAt?.slice(0, 5) ?? null, closesAt: hour?.closesAt?.slice(0, 5) ?? null };
    }),
  };
}

export function isRestaurantOpenAt(hours: OperatingHour[], timezone: string, instant: Date, override: OperationalOverride = "DEFAULT") {
  if (override === "OPEN") return true;
  if (override === "CLOSED") return false;
  if (hours.length === 0) return true;
  const local = localParts(instant, timezone);
  const day = hours.find((hour) => hour.dayOfWeek === local.dayOfWeek);
  return Boolean(day?.active && day.opensAt && day.closesAt && local.minutes >= timeMinutes(day.opensAt) && local.minutes < timeMinutes(day.closesAt));
}

export function isReservationWithinOperatingHours(hours: OperatingHour[], timezone: string, startsAt: Date, endsAt: Date, override: OperationalOverride = "DEFAULT") {
  if (override === "OPEN") return true;
  if (override === "CLOSED") return false;
  if (hours.length === 0) return true;
  const start = localParts(startsAt, timezone);
  const end = localParts(endsAt, timezone);
  if (start.date !== end.date || start.dayOfWeek !== end.dayOfWeek) return false;
  const day = hours.find((hour) => hour.dayOfWeek === start.dayOfWeek);
  return Boolean(day?.active && day.opensAt && day.closesAt && start.minutes >= timeMinutes(day.opensAt) && end.minutes <= timeMinutes(day.closesAt));
}
