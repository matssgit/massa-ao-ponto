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

export const createPublicOrderBodySchema = z.object({
  type: z.literal("PICKUP"),
  customer: publicCustomerSchema,
  items: z.array(publicOrderItemSchema).min(1).max(20),
  observation: z.string().max(500).optional(),
}).strict();

export const publicOrderTokenParamsSchema = z.object({
  token: z.string().max(200),
}).strict();

export type CreatePublicOrderBody = z.infer<typeof createPublicOrderBodySchema>;
