import { z } from "zod";

export const createAddonBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.number().int().nonnegative(),
});

export const updateAddonBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  price: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

export const addonParamsSchema = z.object({
  restaurantId: z.string().uuid(),
  addonId: z.string().uuid(),
});

export const listAddonsParamsSchema = z.object({
  restaurantId: z.string().uuid(),
});

export const listAddonsQuerySchema = z.object({
  active: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
});

export const getAddonParamsSchema = z.object({
  restaurantId: z.string().uuid(),
  addonId: z.string().uuid(),
});
