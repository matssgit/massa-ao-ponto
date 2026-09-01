import { z } from "zod";

export const createTableParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
});

export const createTableBodySchema = z.object({
  number: z.coerce.number().int().positive().transform(String),
  capacity: z.number().int().positive(),
  type: z.enum(["table", "room"]),
});

export const updateTableParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
  tableId: z.string().uuid("Invalid table ID format."),
});

export const updateTableBodySchema = z.object({
  number: z.coerce.number().int().positive().transform(String).optional(),
  capacity: z.number().int().positive().optional(),
  type: z.enum(["table", "room"]).optional(),
  active: z.boolean().optional(),
});
