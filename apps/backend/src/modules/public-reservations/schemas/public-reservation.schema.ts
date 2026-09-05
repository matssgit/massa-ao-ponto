import { z } from "zod";
import { customerInputSchema } from "../../customers/schemas/customer.schema.js";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const publicRestaurantParamsSchema = z.object({ slug });
export const publicReservationTokenParamsSchema = z.object({ token });
export const publicAvailabilityQuerySchema = z.object({
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  partySize: z.coerce.number().int().positive().optional(),
});
export const createPublicReservationBodySchema = z.object({
  tableId: z.string().uuid(),
  customer: customerInputSchema,
  partySize: z.number().int().positive(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  notes: z.string().optional().nullable(),
});