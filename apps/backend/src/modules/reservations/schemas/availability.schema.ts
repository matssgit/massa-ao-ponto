import { z } from "zod";

export const getAvailabilityParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
});

export const getAvailabilityQuerySchema = z.object({
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  people: z.coerce.number().int().positive().optional(),
});
