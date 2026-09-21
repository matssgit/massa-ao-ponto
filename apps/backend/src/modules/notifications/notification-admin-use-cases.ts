import type { NotificationAdminRepository, NotificationFilters, NotificationRecord } from "./notification-admin-repository.js";
import { notificationAdminView } from "./notification-admin-repository.js";
import { NotificationNotFoundError, NotificationRetryConflictError } from "./notification-admin-errors.js";
import { notificationTemplates } from "./notification-templates.js";
import type { WhatsAppProvider } from "./whatsapp-provider.js";

export class ListNotificationsUseCase {
  constructor(private readonly repository: NotificationAdminRepository) {}
  async execute(input: NotificationFilters) {
    const { items, total } = await this.repository.list(input);
    const totalPages = Math.ceil(total / input.limit);
    return { data: items.map(notificationAdminView), meta: {
      page: input.page, limit: input.limit, total, totalPages,
      hasNext: input.page < totalPages, hasPrevious: input.page > 1,
    } };
  }
}
export class RetryNotificationUseCase {
  constructor(private readonly repository: NotificationAdminRepository, private readonly provider: WhatsAppProvider) {}
  private async rebuild(record: NotificationRecord) {
    if (record.type === "RESERVATION_CREATED" || record.type === "RESERVATION_REMINDER") {
      const context = await this.repository.findReservationContextById(record.resourceId);
      if (!context || context.restaurantId !== record.restaurantId) return { ok: false, error: "RESOURCE_UNAVAILABLE" } as const;
      if (!context.whatsappNotificationsEnabled) return { ok: false, error: "NOTIFICATIONS_DISABLED" } as const;
      return { ok: true, phone: context.customerPhone, message: record.type === "RESERVATION_CREATED"
        ? notificationTemplates.reservationCreated(context) : notificationTemplates.reservationReminder(context) } as const;
    }
    const context = await this.repository.findOrderContextById(record.resourceId);
    if (!context || context.restaurantId !== record.restaurantId
      || (record.type === "ORDER_READY" && context.type !== "PICKUP")
      || (record.type === "ORDER_OUT_FOR_DELIVERY" && context.type !== "DELIVERY")) return { ok: false, error: "RESOURCE_UNAVAILABLE" } as const;
    if (!context.whatsappNotificationsEnabled) return { ok: false, error: "NOTIFICATIONS_DISABLED" } as const;
    const templates = {
      ORDER_CREATED: notificationTemplates.orderCreated, ORDER_CONFIRMED: notificationTemplates.orderConfirmed,
      ORDER_READY: notificationTemplates.orderReady, ORDER_OUT_FOR_DELIVERY: notificationTemplates.orderOutForDelivery,
    };
    return { ok: true, phone: context.customerPhone, message: templates[record.type](context) } as const;
  }
  async execute(restaurantId: string, id: string) {
    const current = await this.repository.findByIdAndRestaurantId(id, restaurantId);
    if (!current) throw new NotificationNotFoundError();
    if (current.status !== "FAILED") throw new NotificationRetryConflictError();
    // Claim the same event before external I/O so concurrent retries cannot both send.
    const claimed = await this.repository.claimFailed(id, restaurantId);
    if (!claimed) throw new NotificationRetryConflictError();
    try {
      const message = await this.rebuild(claimed);
      if (!message.ok) await this.repository.markFailed(id, message.error);
      else {
        await this.provider.send({ recipientPhone: message.phone, message: message.message, type: claimed.type });
        await this.repository.markSent(id, new Date());
      }
    } catch {
      await this.repository.markFailed(id, "PROVIDER_ERROR");
    }
    const result = await this.repository.findByIdAndRestaurantId(id, restaurantId);
    if (!result) throw new NotificationNotFoundError();
    return notificationAdminView(result);
  }
}
