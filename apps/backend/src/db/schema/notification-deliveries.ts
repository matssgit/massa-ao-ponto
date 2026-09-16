import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { restaurants } from "./restaurants.js";

export const notificationTypeEnum = pgEnum("notification_type", [
  "RESERVATION_CREATED",
  "RESERVATION_REMINDER",
  "ORDER_CREATED",
  "ORDER_CONFIRMED",
  "ORDER_READY",
  "ORDER_OUT_FOR_DELIVERY",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "PENDING",
  "SENT",
  "FAILED",
]);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id").notNull(),
    type: notificationTypeEnum("type").notNull(),
    status: notificationStatusEnum("status").default("PENDING").notNull(),
    attempts: integer("attempts").default(1).notNull(),
    errorCode: text("error_code"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("notification_deliveries_type_resource_unique").on(table.type, table.resourceId),
    index("notification_deliveries_restaurant_created_idx").on(table.restaurantId, table.createdAt),
    index("notification_deliveries_status_idx").on(table.status),
  ],
);
