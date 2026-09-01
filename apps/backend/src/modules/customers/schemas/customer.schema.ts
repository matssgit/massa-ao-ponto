import { z } from "zod";

import {
  MIN_CUSTOMER_PHONE_LENGTH,
  normalizeCustomerPhone,
} from "../domain/customer-phone.js";

export const customerInputSchema = z.object({
  name: z.string().min(2),
  phone: z
    .string()
    .transform(normalizeCustomerPhone)
    .pipe(z.string().min(MIN_CUSTOMER_PHONE_LENGTH)),
  email: z.string().email().optional().nullable(),
});

export const getCustomerParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
  customerId: z.string().uuid("Invalid customer ID format."),
});

export const listCustomersParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
});

export const listCustomersQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
