import type { Reservation } from "../reservations/repositories/reservations-repository.js";
import type { Restaurant } from "../restaurants/repositories/restaurants-repository.js";
import type { Table } from "../tables/repositories/tables-repository.js";

export function publicRestaurantView(restaurant: Restaurant) {
  return {
    name: restaurant.name,
    slug: restaurant.slug,
    address: restaurant.address,
    phone: restaurant.phone || null,
    timezone: restaurant.timezone,
  };
}

export function publicReservationView(reservation: Reservation, restaurant: Restaurant, table: Table) {
  return {
    restaurant: publicRestaurantView(restaurant),
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