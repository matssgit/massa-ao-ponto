import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { customers } from "./customers.js";
import { relations } from "drizzle-orm";
import { reservationHistory } from "./reservation-history.js";
import { reservationStatusEnum } from "./reservation-status.js";
import { restaurants } from "./restaurants.js";
import { tables } from "./tables.js";

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    tableId: uuid("table_id")
      .notNull()
      .references(() => tables.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    status: text("status", { enum: reservationStatusEnum })
      .default("SCHEDULED")
      .notNull(),
    people: integer("people").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    observation: text("observation"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    restaurantStartsEndsIdx: index(
      "idx_reservations_restaurant_starts_ends",
    ).on(table.restaurantId, table.startsAt, table.endsAt),
    tableIdx: index("idx_reservations_table_id").on(table.tableId),
    customerIdx: index("idx_reservations_customer_id").on(table.customerId),
  }),
);

export const reservationsRelations = relations(
  reservations,
  ({ one, many }) => ({
    restaurant: one(restaurants, {
      fields: [reservations.restaurantId],
      references: [restaurants.id],
    }),
    table: one(tables, {
      fields: [reservations.tableId],
      references: [tables.id],
    }),
    customer: one(customers, {
      fields: [reservations.customerId],
      references: [customers.id],
    }),
    history: many(reservationHistory),
  }),
);
