import { z } from "zod";
import { MIN_CUSTOMER_PHONE_LENGTH, normalizeCustomerPhone } from "../../customers/domain/customer-phone.js";

const publicCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().min(1).max(30).transform(normalizeCustomerPhone)
    .pipe(z.string().min(MIN_CUSTOMER_PHONE_LENGTH)),
  email: z.string().trim().max(254).email().optional().nullable(),
}).strict();

const publicAddonSchema = z.object({
  addonId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
}).strict();

const publicOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  addons: z.array(publicAddonSchema).max(10).optional(),
}).strict();

const publicDeliveryAddressSchema = z.object({
  street: z.string().trim().min(1).max(255),
  number: z.string().trim().min(1).max(50),
  complement: z.string().trim().max(255).optional(),
  neighborhood: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  zipCode: z.string().trim().min(8).max(10),
}).strict();

const publicOrderBaseSchema = z.object({
  customer: publicCustomerSchema,
  items: z.array(publicOrderItemSchema).min(1).max(20),
  observation: z.string().max(500).optional(),
});

export const createPublicOrderBodySchema = z.discriminatedUnion("type", [
  publicOrderBaseSchema.extend({ type: z.literal("PICKUP") }).strict(),
  publicOrderBaseSchema.extend({
    type: z.literal("DELIVERY"),
    deliveryAddress: publicDeliveryAddressSchema,
  }).strict(),
]);

export const publicOrderTokenParamsSchema = z.object({
  token: z.string().max(200),
}).strict();

export type CreatePublicOrderBody = z.infer<typeof createPublicOrderBodySchema>;
