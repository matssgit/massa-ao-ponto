import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";
import { reservationStatusEnum } from "./reservation-status.js";
import { reservations } from "./reservations.js";

export const reservationHistory = pgTable("reservation_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id")
    .notNull()
    .references(() => reservations.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  previousStatus: text("previous_status", { enum: reservationStatusEnum }),
  newStatus: text("new_status", { enum: reservationStatusEnum }).notNull(),
  observation: text("observation"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reservationHistoryRelations = relations(
  reservationHistory,
  ({ one }) => ({
    reservation: one(reservations, {
      fields: [reservationHistory.reservationId],
      references: [reservations.id],
    }),
  }),
);
