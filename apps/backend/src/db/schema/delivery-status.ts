import { pgEnum } from "drizzle-orm/pg-core";

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "PENDING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);
