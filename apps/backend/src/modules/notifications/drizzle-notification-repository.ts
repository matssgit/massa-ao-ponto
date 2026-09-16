import { and, eq, gte, inArray, lt, type SQL } from "drizzle-orm";

import { db } from "../../db/index.js";
import {
  customers,
  notificationDeliveries,
  orders,
  reservations,
  restaurants,
} from "../../db/schema/index.js";
import type { NotificationRepository } from "./notification-repository.js";
import type { NotificationType } from "./notification-types.js";

export class DrizzleNotificationRepository implements NotificationRepository {
  async claim(input: { restaurantId: string; resourceId: string; type: NotificationType }) {
    const [delivery] = await db
      .insert(notificationDeliveries)
      .values(input)
      .onConflictDoNothing({
        target: [notificationDeliveries.type, notificationDeliveries.resourceId],
      })
      .returning({ id: notificationDeliveries.id });
    return delivery ?? null;
  }

  async markSent(id: string, sentAt: Date) {
    await db
      .update(notificationDeliveries)
      .set({ status: "SENT", sentAt, updatedAt: sentAt, errorCode: null })
      .where(eq(notificationDeliveries.id, id));
  }

  async markFailed(id: string, errorCode: string) {
    await db
      .update(notificationDeliveries)
      .set({ status: "FAILED", errorCode, updatedAt: new Date() })
      .where(eq(notificationDeliveries.id, id));
  }

  private async findReservationContext(where: SQL) {
    const [context] = await db
      .select({
        resourceId: reservations.id,
        restaurantId: reservations.restaurantId,
        restaurantName: restaurants.name,
        timezone: restaurants.timezone,
        whatsappNotificationsEnabled: restaurants.whatsappNotificationsEnabled,
        customerName: customers.name,
        customerPhone: customers.phone,
        people: reservations.people,
        startsAt: reservations.startsAt,
      })
      .from(reservations)
      .innerJoin(restaurants, eq(restaurants.id, reservations.restaurantId))
      .innerJoin(customers, eq(customers.id, reservations.customerId))
      .where(where);
    return context ?? null;
  }

  findReservationContextById(id: string) {
    return this.findReservationContext(eq(reservations.id, id));
  }

  findReservationContextByTokenHash(tokenHash: string) {
    return this.findReservationContext(eq(reservations.publicAccessTokenHash, tokenHash));
  }

  private async findOrderContext(where: SQL) {
    const [context] = await db
      .select({
        resourceId: orders.id,
        restaurantId: orders.restaurantId,
        restaurantName: restaurants.name,
        whatsappNotificationsEnabled: restaurants.whatsappNotificationsEnabled,
        customerName: orders.customerName,
        customerPhone: orders.customerPhone,
        type: orders.type,
        total: orders.total,
      })
      .from(orders)
      .innerJoin(restaurants, eq(restaurants.id, orders.restaurantId))
      .where(where);
    return context ?? null;
  }

  findOrderContextById(id: string) {
    return this.findOrderContext(eq(orders.id, id));
  }

  findOrderContextByTokenHash(tokenHash: string) {
    return this.findOrderContext(eq(orders.publicAccessTokenHash, tokenHash));
  }

  async findReservationReminderCandidateIds(input: { startsAt: Date; endsAt: Date }) {
    const rows = await db
      .select({ id: reservations.id })
      .from(reservations)
      .innerJoin(restaurants, eq(restaurants.id, reservations.restaurantId))
      .where(and(
        eq(restaurants.whatsappNotificationsEnabled, true),
        inArray(reservations.status, ["SCHEDULED", "CONFIRMED"]),
        gte(reservations.startsAt, input.startsAt),
        lt(reservations.startsAt, input.endsAt),
      ));
    return rows.map((row) => row.id);
  }
}
