import type {
  NotificationType,
  OrderNotificationContext,
  ReservationNotificationContext,
} from "./notification-types.js";

export interface NotificationClaim {
  id: string;
}

export interface NotificationRepository {
  claim(input: {
    restaurantId: string;
    resourceId: string;
    type: NotificationType;
  }): Promise<NotificationClaim | null>;
  markSent(id: string, sentAt: Date): Promise<void>;
  markFailed(id: string, errorCode: string): Promise<void>;
  findReservationContextById(id: string): Promise<ReservationNotificationContext | null>;
  findReservationContextByTokenHash(tokenHash: string): Promise<ReservationNotificationContext | null>;
  findOrderContextById(id: string): Promise<OrderNotificationContext | null>;
  findOrderContextByTokenHash(tokenHash: string): Promise<OrderNotificationContext | null>;
  findReservationReminderCandidateIds(input: { startsAt: Date; endsAt: Date }): Promise<string[]>;
}
