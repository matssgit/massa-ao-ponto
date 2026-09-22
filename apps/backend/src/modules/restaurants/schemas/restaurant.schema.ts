import { z } from "zod";

export const createRestaurantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone is required"),
  timezone: z.string().min(1, "Timezone is required"),
});

export const updateRestaurantParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
});

export const updateRestaurantBodySchema = createRestaurantSchema.partial().extend({
  slug: z.string().min(1).max(100).nullable().optional(),
  publicEnabled: z.boolean().optional(),
  deliveryEnabled: z.boolean().optional(),
  deliveryFeeCents: z.number().int().min(0).optional(),
  whatsappNotificationsEnabled: z.boolean().optional(),
  pixKey: z.string().trim().min(1).max(255).nullable().optional(),
  pixRecipientName: z.string().trim().min(1).max(120).nullable().optional(),
  operationalOverride: z.enum(["DEFAULT", "OPEN", "CLOSED"]).optional(),
});

export type CreateRestaurantBody = z.infer<typeof createRestaurantSchema>;
