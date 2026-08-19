import { z } from "zod";

export const createTableParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
});

export const createTableBodySchema = z.object({
  number: z.coerce.number().int().positive().transform(String),
  capacity: z.number().int().positive(),
  type: z.enum(["table", "room"]),
});
