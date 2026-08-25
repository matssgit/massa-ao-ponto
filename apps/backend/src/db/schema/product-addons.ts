import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";

import { addons } from "./addons.js";
import { products } from "./products.js";

export const productAddons = pgTable(
  "product_addons",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    addonId: uuid("addon_id")
      .notNull()
      .references(() => addons.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.productId, table.addonId] }),
    };
  },
);
