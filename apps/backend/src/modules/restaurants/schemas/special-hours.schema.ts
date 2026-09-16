import { z } from "zod";

const date = z.iso.date();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:mm.");
const label = z.string().trim().min(1).max(120).nullable().optional();
const closed = z.object({ date, closed: z.literal(true), opensAt: z.null().optional(), closesAt: z.null().optional(), label }).transform((value) => ({ ...value, opensAt: null, closesAt: null, label: value.label ?? null }));
const open = z.object({ date, closed: z.literal(false), opensAt: time, closesAt: time, label })
  .refine((value) => value.opensAt < value.closesAt, { message: "A abertura deve ser anterior ao fechamento.", path: ["closesAt"] })
  .transform((value) => ({ ...value, label: value.label ?? null }));
export const specialHourBodySchema = z.union([closed, open]);
export const specialHoursParamsSchema = z.object({ restaurantId: z.uuid() });
export const specialHourParamsSchema = specialHoursParamsSchema.extend({ specialHourId: z.uuid() });
