import { z } from "zod";

export const getCustomerParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
  customerId: z.string().uuid("Invalid customer ID format."),
});
