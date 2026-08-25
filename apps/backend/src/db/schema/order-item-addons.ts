import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { addons } from "./addons.js";
import { orderItems } from "./order-items.js";
import { randomUUID } from "node:crypto";

export const orderItemAddons = pgTable(
  "order_item_addons",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),

    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),

    addonId: uuid("addon_id")
      .notNull()
      .references(() => addons.id, { onDelete: "restrict" }),

    addonName: text("addon_name").notNull(),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    subtotal: integer("subtotal").notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      orderItemIdIdx: index("order_item_addons_order_item_id_idx").on(
        table.orderItemId,
      ),
    };
  },
);
