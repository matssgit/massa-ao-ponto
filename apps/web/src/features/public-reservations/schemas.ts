import { z } from "zod";

export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const restaurantSchema = z.object({ name: z.string(), slug: z.string().nullable(), address: z.string(), phone: z.string().nullable(), timezone: z.string(), deliveryEnabled: z.boolean(), deliveryFeeCents: z.number().int().nonnegative() }).strict();
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
const publicAddonSchema = z.object({
  id: z.uuid(), name: z.string(), description: z.string().nullable(), price: z.number().int().nonnegative(),
}).strict();
const publicProductSchema = z.object({
  id: z.uuid(), categoryId: z.uuid(), name: z.string(), description: z.string().nullable(),
  price: z.number().int().nonnegative(), displayOrder: z.number().int().nonnegative(), addons: z.array(publicAddonSchema),
}).strict();
const publicCategorySchema = z.object({
  id: z.uuid(), name: z.string(), displayOrder: z.number().int().nonnegative(), products: z.array(publicProductSchema),
}).strict();
export const publicCatalogSchema = z.object({ categories: z.array(publicCategorySchema) }).strict();
const publicOrderAddonSnapshotSchema = z.object({
  addonName: z.string(), unitPrice: z.number().int().nonnegative(),
  quantity: z.number().int().positive(), subtotal: z.number().int().nonnegative(),
}).strict();
const publicOrderItemSnapshotSchema = z.object({
  productName: z.string(), unitPrice: z.number().int().nonnegative(),
  quantity: z.number().int().positive(), subtotal: z.number().int().nonnegative(),
  addons: z.array(publicOrderAddonSnapshotSchema),
}).strict();
export const publicOrderDetailsSchema = z.object({
  order: z.object({
    status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
    type: z.enum(["PICKUP", "DELIVERY"]),
    subtotal: z.number().int().nonnegative(),
    deliveryFee: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    paymentStatus: z.enum(["PENDING", "PAID"]),
    createdAt: z.iso.datetime({ offset: true }),
    deliveryAddress: z.object({
      street: z.string(), number: z.string(), complement: z.string().nullable(),
      neighborhood: z.string(), city: z.string(), state: z.string(), zipCode: z.string(),
    }).strict().nullable(),
  }).strict(),
  delivery: z.object({ status: z.enum(["PENDING", "OUT_FOR_DELIVERY", "DELIVERED"]) }).strict().nullable(),
  items: z.array(publicOrderItemSnapshotSchema),
}).strict();
export const createdPublicOrderSchema = publicOrderDetailsSchema.extend({ accessToken: tokenSchema }).strict();
export const publicOrderCustomerFormSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome com pelo menos 2 caracteres.").max(120, "O nome deve ter no máximo 120 caracteres."),
  phone: z.string().min(1, "Informe seu telefone.").max(30, "O telefone deve ter no máximo 30 caracteres.")
    .refine(value => value.replace(/\D/g, "").length >= 10, "Informe o telefone com DDD (ao menos 10 dígitos)."),
  email: z.union([z.literal(""), z.string().max(254, "O e-mail deve ter no máximo 254 caracteres.").email("Informe um e-mail válido.")]),
  observation: z.string().max(500, "A observação deve ter no máximo 500 caracteres."),
});
export const publicDeliveryAddressFormSchema = z.object({
  street: z.string().trim().min(1, "Informe a rua.").max(255),
  number: z.string().trim().min(1, "Informe o número.").max(50),
  complement: z.string().trim().max(255),
  neighborhood: z.string().trim().min(1, "Informe o bairro.").max(120),
  city: z.string().trim().min(1, "Informe a cidade.").max(120),
  state: z.string().trim().length(2, "Informe a UF com 2 letras."),
  zipCode: z.string().trim().min(8, "Informe o CEP.").max(10),
});
export const customerFormSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome com pelo menos 2 caracteres."),
  phone: z.string().min(1, "Informe seu telefone.").refine(value => value.replace(/\D/g, "").length >= 10, "Informe o telefone com DDD (ao menos 10 dígitos)."),
  email: z.union([z.literal(""), z.email("Informe um e-mail válido.")]),
  notes: z.string(),
});
export type PublicRestaurant = z.infer<typeof restaurantSchema>;
export type AvailableTable = z.infer<typeof availabilitySchema>[number];
export type PublicDetails = z.infer<typeof detailsSchema>;
export type PublicCatalog = z.infer<typeof publicCatalogSchema>;
export type PublicOrderDetails = z.infer<typeof publicOrderDetailsSchema>;
type CreatePublicOrderBase = {
  customer: { name: string; phone: string; email?: string };
  items: { productId: string; quantity: number; addons?: { addonId: string; quantity: number }[] }[];
  observation?: string;
};
export type CreatePublicOrderInput = CreatePublicOrderBase & (
  | { type: "PICKUP" }
  | { type: "DELIVERY"; deliveryAddress: { street: string; number: string; complement?: string; neighborhood: string; city: string; state: string; zipCode: string } }
);
export type Period = { partySize: number; startsAt: string; endsAt: string };
export type CreateInput = Period & { tableId: string; customer: { name: string; phone: string; email?: string }; notes?: string };
