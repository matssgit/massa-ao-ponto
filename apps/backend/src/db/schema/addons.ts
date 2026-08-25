import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { randomUUID } from "node:crypto";
import { restaurants } from "./restaurants.js";

export const addons = pgTable(
  "addons",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    price: integer("price").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      restaurantIdNameIdx: index("addons_restaurant_id_name_idx").on(
        table.restaurantId,
        table.name,
      ),
    };
  },
);
