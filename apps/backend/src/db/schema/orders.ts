import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  orderPaymentStatusEnum,
  orderStatusEnum,
  orderTypeEnum,
} from "./order-status.js";

import { customers } from "./customers.js";
import { randomUUID } from "node:crypto";
import { restaurants } from "./restaurants.js";
import { tables } from "./tables.js";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    tableId: uuid("table_id").references(() => tables.id),
    type: orderTypeEnum("type").notNull(),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    paymentStatus: orderPaymentStatusEnum("payment_status")
      .notNull()
      .default("PENDING"),

    subtotal: integer("subtotal").notNull(),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    total: integer("total").notNull(),

    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),

    deliveryStreet: text("delivery_street"),
    deliveryNumber: text("delivery_number"),
    deliveryComplement: text("delivery_complement"),
    deliveryNeighborhood: text("delivery_neighborhood"),
    deliveryCity: text("delivery_city"),
    deliveryState: text("delivery_state"),
    deliveryZipCode: text("delivery_zip_code"),

    observation: text("observation"),
    publicAccessTokenHash: text("public_access_token_hash"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      restaurantIdIdx: index("orders_restaurant_id_idx").on(table.restaurantId),
      customerIdIdx: index("orders_customer_id_idx").on(table.customerId),
      publicAccessTokenHashUnique: uniqueIndex(
        "orders_public_access_token_hash_unique",
      ).on(table.publicAccessTokenHash),
    };
  },
);
