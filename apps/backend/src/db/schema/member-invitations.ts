import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { membershipRoleEnum } from "./membership-role.js";
import { restaurants } from "./restaurants.js";
import { users } from "./users.js";

export const memberInvitations = pgTable(
  "member_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: membershipRoleEnum("role").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "member_invitations_email_canonical_check",
      sql`${table.email} = lower(btrim(${table.email})) AND ${table.email} <> ''`,
    ),
    index("member_invitations_restaurant_email_idx").on(
      table.restaurantId,
      table.email,
    ),
    index("member_invitations_expires_at_idx").on(table.expiresAt),
  ],
);
