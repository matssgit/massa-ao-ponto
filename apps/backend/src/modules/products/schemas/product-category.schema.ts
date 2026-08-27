import { z } from "zod";

export const createProductCategoryBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  displayOrder: z.number().int().nonnegative().optional().default(0),
});

export const productCategoryParamsSchema = z.object({
  restaurantId: z.string().uuid(),
});

export const getCategoryParamsSchema = z.object({
  restaurantId: z.string().uuid(),
  categoryId: z.string().uuid(),
});

export const updateCategoryParamsSchema = z.object({
  restaurantId: z.string().uuid(),
  categoryId: z.string().uuid(),
});

export const updateCategoryBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  displayOrder: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

export const deleteCategoryParamsSchema = z.object({
  restaurantId: z.string().uuid(),
  categoryId: z.string().uuid(),
});
