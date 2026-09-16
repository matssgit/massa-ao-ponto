import { relations, sql } from "drizzle-orm";
import { boolean, check, date, pgTable, time, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants.js";

export const restaurantSpecialHours = pgTable("restaurant_special_hours", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  closed: boolean("closed").notNull(),
  opensAt: time("opens_at", { precision: 0 }),
  closesAt: time("closes_at", { precision: 0 }),
  label: varchar("label", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  restaurantDateUnique: uniqueIndex("restaurant_special_hours_restaurant_date_unique").on(table.restaurantId, table.date),
  interval: check("restaurant_special_hours_interval_check", sql`(${table.closed} and ${table.opensAt} is null and ${table.closesAt} is null) or (not ${table.closed} and ${table.opensAt} is not null and ${table.closesAt} is not null and ${table.opensAt} < ${table.closesAt})`),
}));

export const restaurantSpecialHoursRelations = relations(restaurantSpecialHours, ({ one }) => ({
  restaurant: one(restaurants, { fields: [restaurantSpecialHours.restaurantId], references: [restaurants.id] }),
}));
