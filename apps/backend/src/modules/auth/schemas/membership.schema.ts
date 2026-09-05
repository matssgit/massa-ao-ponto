import { z } from "zod";

import { normalizeEmail } from "../normalize-email.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export const memberParamsSchema = z.object({
  restaurantId: z.uuid(),
  membershipId: z.uuid(),
}).strict();

export const restaurantParamsSchema = z.object({ restaurantId: z.uuid() }).strict();
export const listMembersQuerySchema = paginationSchema;
export const listInvitationsQuerySchema = paginationSchema;

export const updateMembershipBodySchema = z.object({
  role: z.enum(["OWNER", "STAFF"]).optional(),
  active: z.boolean().optional(),
}).strict().refine((value) => value.role !== undefined || value.active !== undefined, {
  message: "At least one membership change is required.",
});

export const createInvitationBodySchema = z.object({
  email: z.string().transform(normalizeEmail).pipe(z.email()),
}).strict();

export const invitationParamsSchema = z.object({
  restaurantId: z.uuid(),
  invitationId: z.uuid(),
}).strict();

const invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const acceptNewUserInvitationBodySchema = z.object({
  token: invitationTokenSchema,
  password: z.string().min(12).max(1024),
}).strict();

export const acceptExistingUserInvitationBodySchema = z.object({
  token: invitationTokenSchema,
}).strict();
