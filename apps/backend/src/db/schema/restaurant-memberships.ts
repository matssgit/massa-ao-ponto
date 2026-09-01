import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { membershipRoleEnum } from "./membership-role.js";
import { restaurants } from "./restaurants.js";
import { users } from "./users.js";

export const restaurantMemberships = pgTable(
  "restaurant_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("restaurant_memberships_user_restaurant_unique").on(
      table.userId,
      table.restaurantId,
    ),
    index("restaurant_memberships_restaurant_id_idx").on(table.restaurantId),
  ],
);
