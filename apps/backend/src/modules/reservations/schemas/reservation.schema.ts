import { reservationStatusEnum } from "../../../db/schema/reservation-status.js";
import { customerInputSchema } from "../../customers/schemas/customer.schema.js";
import { z } from "zod";

export const createReservationParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
});

export const createReservationBodySchema = z.object({
  tableId: z.string().uuid("Invalid table ID format."),
  customer: customerInputSchema,
  people: z.number().int().positive(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  observation: z.string().optional().nullable(),
});

export const updateReservationStatusParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
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
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const cancelReservationParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
  reservationId: z.string().uuid("Invalid reservation ID format."),
});

export const getReservationParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
  reservationId: z.string().uuid("Invalid reservation ID format."),
});
