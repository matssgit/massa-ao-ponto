import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { deliveries } from "./deliveries.js";

export const deliveryHistory = pgTable(
  "delivery_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => deliveries.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 255 }).notNull(),
    previousStatus: varchar("previous_status", { length: 50 }).notNull(),
    newStatus: varchar("new_status", { length: 50 }).notNull(),
    observation: text("observation"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      deliveryIdCreatedAtIdx: index(
        "delivery_history_delivery_id_created_at_idx",
      ).on(table.deliveryId, table.createdAt),
    };
  },
);
