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
