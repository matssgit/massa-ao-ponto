import { z } from "zod";

export const getSalesSummaryParamsSchema = z.object({
  restaurantId: z.string().uuid("ID do restaurante inválido."),
});

export const getSalesSummaryQuerySchema = z.object({
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

export const getTopProductsQuerySchema = z.object({
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const getCategoryPerformanceQuerySchema = z.object({
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const getTopCustomersQuerySchema = z.object({
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
