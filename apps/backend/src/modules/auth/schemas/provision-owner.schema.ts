import { z } from "zod";
import { createRestaurantSchema } from "../../restaurants/schemas/restaurant.schema.js";
import { InvalidOwnerProvisioningInputError } from "../errors/owner-provisioning-errors.js";
import { normalizeEmail } from "../normalize-email.js";
import { loginBodySchema } from "./auth.schema.js";

export const provisionOwnerSchema = z.object({
  email: loginBodySchema.shape.email.transform(normalizeEmail).pipe(z.email()),
  password: loginBodySchema.shape.password.min(12),
  restaurant: createRestaurantSchema.extend({
    name: createRestaurantSchema.shape.name.max(255),
    address: createRestaurantSchema.shape.address.max(255),
    phone: createRestaurantSchema.shape.phone.max(50),
    timezone: createRestaurantSchema.shape.timezone.max(100),
  }).strict(),
}).strict();

export type ProvisionOwnerInput = z.infer<typeof provisionOwnerSchema>;

export function parseProvisionOwnerInput(input: unknown): ProvisionOwnerInput {
  const result = provisionOwnerSchema.safeParse(input);
  if (!result.success) throw new InvalidOwnerProvisioningInputError();
  return result.data;
}
