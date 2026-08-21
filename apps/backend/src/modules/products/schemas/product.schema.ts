import { z } from "zod";

export const productParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
});

export const createProductBodySchema = z.object({
  categoryId: z.string().uuid("Invalid category ID format."),
  name: z.string().min(1, "Name is required."),
  description: z.string().nullable().optional(),
  price: z
    .number()
    .int()
    .min(0, "Price must be greater than or equal to 0 (cents)."),
  displayOrder: z.number().int().min(0).default(0),
});

export const listProductsQuerySchema = z.object({
  categoryId: z.string().uuid("Invalid category ID format.").optional(),
  // Como as query strings chegam como texto, valido "true"/"false" e transformo em boolean:
  active: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
});
