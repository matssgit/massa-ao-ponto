export type NotificationType =
  | "RESERVATION_CREATED"
  | "RESERVATION_REMINDER"
  | "ORDER_CREATED"
  | "ORDER_CONFIRMED"
  | "ORDER_READY"
  | "ORDER_OUT_FOR_DELIVERY";

export type NotificationStatus = "PENDING" | "SENT" | "FAILED";

export interface ReservationNotificationContext {
  resourceId: string;
  restaurantId: string;
  restaurantName: string;
  timezone: string;
  whatsappNotificationsEnabled: boolean;
  customerName: string;
  customerPhone: string;
  people: number;
  startsAt: Date;
}

export interface OrderNotificationContext {
  resourceId: string;
  restaurantId: string;
  restaurantName: string;
  whatsappNotificationsEnabled: boolean;
  customerName: string;
  customerPhone: string;
  type: "DELIVERY" | "PICKUP" | "DINE_IN";
  total: number;
}
