import { z } from "zod";

export const productCategoryParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
});

export const createProductCategoryBodySchema = z.object({
  name: z.string().min(1, "Name is required."),
  description: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).default(0),
});
