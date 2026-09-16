import { z } from "zod";

const dayOfWeek = z.number().int().min(0).max(6);
const localTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:mm.");
const openDay = z.object({ dayOfWeek, active: z.literal(true), opensAt: localTime, closesAt: localTime })
  .refine((day) => day.opensAt < day.closesAt, { message: "A abertura deve ser anterior ao fechamento.", path: ["closesAt"] });
const closedDay = z.object({ dayOfWeek, active: z.literal(false), opensAt: z.null(), closesAt: z.null() });
export const operatingHoursWeekSchema = z.array(z.union([openDay, closedDay])).length(7).superRefine((days, context) => {
  const unique = new Set(days.map((day) => day.dayOfWeek));
  if (unique.size !== 7) context.addIssue({ code: "custom", message: "Informe cada dia da semana exatamente uma vez." });
});
export const operatingHoursParamsSchema = z.object({ restaurantId: z.uuid() });
export const updateOperatingHoursBodySchema = z.object({ days: operatingHoursWeekSchema });
