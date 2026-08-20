import { z } from "zod";

export const getCustomerParamsSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID format."),
});
