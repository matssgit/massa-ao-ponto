import { relations, sql } from "drizzle-orm";
import { boolean, check, integer, pgTable, time, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants.js";

export const restaurantOperatingHours = pgTable("restaurant_operating_hours", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  opensAt: time("opens_at", { precision: 0 }),
  closesAt: time("closes_at", { precision: 0 }),
  active: boolean("active").notNull(),
}, (table) => ({
  restaurantDayUnique: uniqueIndex("restaurant_operating_hours_restaurant_day_unique").on(table.restaurantId, table.dayOfWeek),
  dayRange: check("restaurant_operating_hours_day_range_check", sql`${table.dayOfWeek} between 0 and 6`),
  interval: check("restaurant_operating_hours_interval_check", sql`(${table.active} and ${table.opensAt} is not null and ${table.closesAt} is not null and ${table.opensAt} < ${table.closesAt}) or (not ${table.active} and ${table.opensAt} is null and ${table.closesAt} is null)`),
}));

export const restaurantOperatingHoursRelations = relations(restaurantOperatingHours, ({ one }) => ({
  restaurant: one(restaurants, { fields: [restaurantOperatingHours.restaurantId], references: [restaurants.id] }),
}));
