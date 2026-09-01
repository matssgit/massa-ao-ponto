import { pgEnum } from "drizzle-orm/pg-core";

export const membershipRoleEnum = pgEnum("membership_role", ["OWNER", "STAFF"]);
