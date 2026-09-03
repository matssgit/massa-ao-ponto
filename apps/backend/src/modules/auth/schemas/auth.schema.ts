import { z } from "zod";

export const loginBodySchema = z.object({
  // Canonicalization belongs to the use case, not a second HTTP-only implementation.
  email: z.string().min(1).max(320),
  password: z.string().min(1).max(1024),
});
