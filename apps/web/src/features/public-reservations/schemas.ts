import { z } from "zod";

export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const restaurantSchema = z.object({ name: z.string(), slug: z.string().nullable(), address: z.string(), phone: z.string().nullable(), timezone: z.string() }).strict();
const tableSchema = z.object({ number: z.string(), capacity: z.number().int().positive(), type: z.enum(["table", "room"]) }).strict();
export const availabilitySchema = z.array(tableSchema.extend({ id: z.uuid() }).strict());
export const detailsSchema = z.object({
  restaurant: restaurantSchema,
  table: tableSchema,
  reservation: z.object({
    status: z.enum(["SCHEDULED", "CONFIRMED", "CANCELLED", "FINISHED", "NO_SHOW"]),
    partySize: z.number().int().positive(),
    startsAt: z.iso.datetime({ offset: true }), endsAt: z.iso.datetime({ offset: true }), notes: z.string().nullable(),
  }).strict(),
}).strict();
export const createdSchema = detailsSchema.extend({ accessToken: tokenSchema }).strict();
export const customerFormSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome com pelo menos 2 caracteres."),
  phone: z.string().min(1, "Informe seu telefone.").refine(value => value.replace(/\D/g, "").length >= 10, "Informe o telefone com DDD (ao menos 10 dígitos)."),
  email: z.union([z.literal(""), z.email("Informe um e-mail válido.")]),
  notes: z.string(),
});
export type PublicRestaurant = z.infer<typeof restaurantSchema>;
export type AvailableTable = z.infer<typeof availabilitySchema>[number];
export type PublicDetails = z.infer<typeof detailsSchema>;
export type Period = { partySize: number; startsAt: string; endsAt: string };
export type CreateInput = Period & { tableId: string; customer: { name: string; phone: string; email?: string }; notes?: string };
