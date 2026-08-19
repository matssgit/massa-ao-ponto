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
