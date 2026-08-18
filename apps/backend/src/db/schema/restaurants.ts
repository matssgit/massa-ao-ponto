import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";
import { tables } from "./tables.js";

export const restaurants = pgTable("restaurants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  timezone: varchar("timezone", { length: 100 })
    .default("America/Sao_Paulo")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  tables: many(tables),
}));
