import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { orders } from "./orders.js";
import { randomUUID } from "node:crypto";

export const orderHistory = pgTable(
  "order_history",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    previousStatus: text("previous_status"),
    newStatus: text("new_status").notNull(),
    observation: text("observation"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      orderIdIdx: index("order_history_order_id_idx").on(table.orderId),
    };
  },
);
