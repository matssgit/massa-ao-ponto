import { pgEnum } from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

export const orderTypeEnum = pgEnum("order_type", [
  "DELIVERY",
  "PICKUP",
  "DINE_IN",
]);

export const orderPaymentStatusEnum = pgEnum("order_payment_status", [
  "PENDING",
  "PAID",
]);
