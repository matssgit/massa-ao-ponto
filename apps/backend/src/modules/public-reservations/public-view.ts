import type { Reservation } from "../reservations/repositories/reservations-repository.js";
import type { Restaurant } from "../restaurants/repositories/restaurants-repository.js";
import type { Table } from "../tables/repositories/tables-repository.js";
import { isRestaurantOpenAt, operatingHoursView } from "../restaurants/operating-hours.js";
import type { OperatingHour } from "../restaurants/repositories/operating-hours-repository.js";
import type { SpecialHour } from "../restaurants/repositories/special-hours-repository.js";
import { restaurantLocalDate } from "../restaurants/operating-hours.js";

export function publicRestaurantView(restaurant: Restaurant, operatingHours: OperatingHour[], specialHours: SpecialHour[] = []) {
  const today = restaurantLocalDate(new Date(), restaurant.timezone);
  return {
    name: restaurant.name,
    slug: restaurant.slug,
    address: restaurant.address,
    phone: restaurant.phone || null,
    timezone: restaurant.timezone,
    deliveryEnabled: restaurant.deliveryEnabled,
    deliveryFeeCents: restaurant.deliveryFeeCents,
    operationalOverride: restaurant.operationalOverride,
    openNow: isRestaurantOpenAt(operatingHours, restaurant.timezone, new Date(), restaurant.operationalOverride, specialHours),
    operatingHours: operatingHoursView(operatingHours),
    specialHours: specialHours
      .filter((entry) => entry.date >= today)
      .map((entry) => ({
        date: entry.date,
        closed: entry.closed,
        opensAt: entry.opensAt?.slice(0, 5) ?? null,
        closesAt: entry.closesAt?.slice(0, 5) ?? null,
        label: entry.label,
      })),
  };
}

export function publicReservationView(reservation: Reservation, restaurant: Restaurant, table: Table, operatingHours: OperatingHour[]) {
  return {
    restaurant: publicRestaurantView(restaurant, operatingHours),
    reservation: {
      status: reservation.status,
      partySize: reservation.people,
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
      notes: reservation.observation,
    },
    table: {
      number: table.number,
      capacity: table.capacity,
      type: table.type,
    },
  };
}
