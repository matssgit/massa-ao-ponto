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

export const updateRestaurantBodySchema = createRestaurantSchema.partial();

export type CreateRestaurantBody = z.infer<typeof createRestaurantSchema>;
