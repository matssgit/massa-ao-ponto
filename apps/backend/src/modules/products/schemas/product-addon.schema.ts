import { z } from "zod";

export const productAddonParamsSchema = z.object({
  restaurantId: z.string().uuid(),
  productId: z.string().uuid(),
  addonId: z.string().uuid(),
});

export const listProductAddonsParamsSchema = z.object({
  restaurantId: z.string().uuid(),
  productId: z.string().uuid(),
});
