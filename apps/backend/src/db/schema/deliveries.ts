import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { deliveryStatusEnum } from "./delivery-status.js";
import { orders } from "./orders.js";

export const deliveries = pgTable(
  "deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" })
      .unique(),
    status: deliveryStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      orderIdIdx: uniqueIndex("deliveries_order_id_idx").on(table.orderId),
    };
  },
);
