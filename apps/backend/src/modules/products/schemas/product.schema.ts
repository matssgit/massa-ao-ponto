import { z } from "zod";

export const productParamsSchema = z.object({
  restaurantId: z.string().uuid(),
});

export const updateProductParamsSchema = z.object({
  restaurantId: z.string().uuid(),
  productId: z.string().uuid(),
});

export const createProductBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.number().int().nonnegative(),
  categoryId: z.string().uuid(),
  displayOrder: z.number().int().nonnegative().optional().default(0),
});

export const listProductsQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  active: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
});

export const updateProductBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  price: z.number().int().nonnegative().optional(),
  categoryId: z.string().uuid().optional(),
  displayOrder: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});
