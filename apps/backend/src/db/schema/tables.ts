import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { reservations } from "./reservations.js";
import { restaurants } from "./restaurants.js";

export const tables = pgTable(
  "tables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    capacity: integer("capacity").notNull(),
    type: text("type").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    capacityCheck: check("capacity_check", sql`${table.capacity} > 0`),
    unqNumberPerRestaurant: uniqueIndex("unq_number_per_restaurant").on(
      table.restaurantId,
      table.number,
    ),
  }),
);

export const tablesRelations = relations(tables, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [tables.restaurantId],
    references: [restaurants.id],
  }),
  reservations: many(reservations),
}));
