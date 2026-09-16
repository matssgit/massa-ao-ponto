import type { Reservation } from "../reservations/repositories/reservations-repository.js";
import type { Restaurant } from "../restaurants/repositories/restaurants-repository.js";
import type { Table } from "../tables/repositories/tables-repository.js";
import { operatingHoursView } from "../restaurants/operating-hours.js";
import type { OperatingHour } from "../restaurants/repositories/operating-hours-repository.js";

export function publicRestaurantView(restaurant: Restaurant, operatingHours: OperatingHour[]) {
  return {
    name: restaurant.name,
    slug: restaurant.slug,
    address: restaurant.address,
    phone: restaurant.phone || null,
    timezone: restaurant.timezone,
    deliveryEnabled: restaurant.deliveryEnabled,
    deliveryFeeCents: restaurant.deliveryFeeCents,
    operatingHours: operatingHoursView(operatingHours),
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
