import { reservationStatusEnum } from "../../../db/schema/reservation-status.js";
import { z } from "zod";

export const createReservationParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
});

export const createReservationBodySchema = z.object({
  tableId: z.string().uuid("Invalid table ID format."),
  customer: z.object({
    name: z.string().min(2),
    phone: z.string().min(10),
    email: z.string().email().optional().nullable(),
  }),
  people: z.number().int().positive(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  observation: z.string().optional().nullable(),
});

export const updateReservationStatusParamsSchema = z.object({
  reservationId: z.string().uuid("Invalid reservation ID format."),
});

export const updateReservationStatusBodySchema = z.object({
  status: z.enum([
    "SCHEDULED",
    "CONFIRMED",
    "CANCELLED",
    "FINISHED",
    "NO_SHOW",
  ]),
  observation: z.string().optional().nullable(),
});

export const listReservationsQuerySchema = z.object({
  status: z.enum(reservationStatusEnum).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

export const cancelReservationParamsSchema = z.object({
  reservationId: z.string().uuid("Invalid reservation ID format."),
});

export const getReservationParamsSchema = z.object({
  reservationId: z.string().uuid("Invalid reservation ID format."),
});
