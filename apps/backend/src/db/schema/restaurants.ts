import { boolean, check, integer, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { relations, sql } from "drizzle-orm";
import { reservations } from "./reservations.js";
import { tables } from "./tables.js";
import { restaurantOperatingHours } from "./restaurant-operating-hours.js";
import { restaurantSpecialHours } from "./restaurant-special-hours.js";

export const operationalOverrideEnum = pgEnum("operational_override", ["DEFAULT", "OPEN", "CLOSED"]);

export const restaurants = pgTable("restaurants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  timezone: varchar("timezone", { length: 100 })
    .default("America/Sao_Paulo")
    .notNull(),
  slug: varchar("slug", { length: 100 }),
  publicEnabled: boolean("public_enabled").default(false).notNull(),
  deliveryEnabled: boolean("delivery_enabled").default(false).notNull(),
  deliveryFeeCents: integer("delivery_fee_cents").default(0).notNull(),
  whatsappNotificationsEnabled: boolean("whatsapp_notifications_enabled")
    .default(false)
    .notNull(),
  pixKey: varchar("pix_key", { length: 255 }),
  pixRecipientName: varchar("pix_recipient_name", { length: 120 }),
  operationalOverride: operationalOverrideEnum("operational_override")
    .default("DEFAULT")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  slugUnique: uniqueIndex("restaurants_slug_unique").on(table.slug),
  slugCanonical: check(
    "restaurants_slug_canonical_check",
    sql`${table.slug} is null or ${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
  ),
  publicRequiresSlug: check(
    "restaurants_public_requires_slug_check",
    sql`not ${table.publicEnabled} or ${table.slug} is not null`,
  ),
  deliveryFeeNonnegative: check(
    "restaurants_delivery_fee_nonnegative_check",
    sql`${table.deliveryFeeCents} >= 0`,
  ),
  pixConfigurationComplete: check(
    "restaurants_pix_configuration_complete_check",
    sql`(${table.pixKey} is null and ${table.pixRecipientName} is null) or (${table.pixKey} is not null and ${table.pixRecipientName} is not null)`,
  ),
}));

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  tables: many(tables),
  reservations: many(reservations),
  operatingHours: many(restaurantOperatingHours),
  specialHours: many(restaurantSpecialHours),
}));
