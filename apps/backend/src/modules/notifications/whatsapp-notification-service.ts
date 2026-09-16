import { hashPublicOrderToken } from "../orders/public-order-tokens.js";
import { hashPublicReservationToken } from "../reservations/public-reservation-tokens.js";
import type { NotificationLogger } from "./development-whatsapp-provider.js";
import type { NotificationRepository } from "./notification-repository.js";
import { notificationTemplates } from "./notification-templates.js";
import type { NotificationType, OrderNotificationContext, ReservationNotificationContext } from "./notification-types.js";
import type { WhatsAppProvider } from "./whatsapp-provider.js";

export type NotificationOutcome = "sent" | "disabled" | "duplicate" | "not_found" | "failed" | "not_applicable";

export class WhatsAppNotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly provider: WhatsAppProvider,
    private readonly options: { publicWebUrl: string | null; logger?: NotificationLogger },
  ) {}

  private link(path: "reserva" | "pedido", token?: string) {
    return this.options.publicWebUrl && token
      ? `${this.options.publicWebUrl}/${path}/${encodeURIComponent(token)}`
      : undefined;
  }

  private async deliver(
    context: ReservationNotificationContext | OrderNotificationContext,
    type: NotificationType,
    message: string,
  ): Promise<NotificationOutcome> {
    if (!context.whatsappNotificationsEnabled) return "disabled";
    const claim = await this.repository.claim({
      restaurantId: context.restaurantId,
      resourceId: context.resourceId,
      type,
    });
    if (!claim) return "duplicate";

    try {
      await this.provider.send({ recipientPhone: context.customerPhone, message, type });
      await this.repository.markSent(claim.id, new Date());
      return "sent";
    } catch {
      try {
        await this.repository.markFailed(claim.id, "PROVIDER_ERROR");
      } catch {
        // The unique PENDING record still prevents an unsafe duplicate send.
      }
      this.options.logger?.error(
        { notificationType: type, resourceId: context.resourceId },
        "WhatsApp notification failed after the domain operation committed.",
      );
      return "failed";
    }
  }

  private async safely(run: () => Promise<NotificationOutcome>, type: NotificationType) {
    try {
      return await run();
    } catch {
      this.options.logger?.error(
        { notificationType: type },
        "WhatsApp notification orchestration failed after the domain operation committed.",
      );
      return "failed" as const;
    }
  }

  notifyReservationCreated(id: string) {
    return this.safely(async () => {
      const context = await this.repository.findReservationContextById(id);
      if (!context) return "not_found";
      return this.deliver(context, "RESERVATION_CREATED", notificationTemplates.reservationCreated(context));
    }, "RESERVATION_CREATED");
  }

  notifyPublicReservationCreated(token: string) {
    return this.safely(async () => {
      const context = await this.repository.findReservationContextByTokenHash(hashPublicReservationToken(token));
      if (!context) return "not_found";
      return this.deliver(context, "RESERVATION_CREATED", notificationTemplates.reservationCreated(context, this.link("reserva", token)));
    }, "RESERVATION_CREATED");
  }

  notifyReservationReminder(id: string) {
    return this.safely(async () => {
      const context = await this.repository.findReservationContextById(id);
      if (!context) return "not_found";
      return this.deliver(context, "RESERVATION_REMINDER", notificationTemplates.reservationReminder(context));
    }, "RESERVATION_REMINDER");
  }

  notifyOrderCreated(id: string) {
    return this.safely(async () => {
      const context = await this.repository.findOrderContextById(id);
      if (!context) return "not_found";
      return this.deliver(context, "ORDER_CREATED", notificationTemplates.orderCreated(context));
    }, "ORDER_CREATED");
  }

  notifyPublicOrderCreated(token: string) {
    return this.safely(async () => {
      const context = await this.repository.findOrderContextByTokenHash(hashPublicOrderToken(token));
      if (!context) return "not_found";
      return this.deliver(context, "ORDER_CREATED", notificationTemplates.orderCreated(context, this.link("pedido", token)));
    }, "ORDER_CREATED");
  }

  notifyOrderStatus(id: string, status: "CONFIRMED" | "READY" | "OUT_FOR_DELIVERY") {
    const notificationType: NotificationType = status === "CONFIRMED"
      ? "ORDER_CONFIRMED"
      : status === "READY"
        ? "ORDER_READY"
        : "ORDER_OUT_FOR_DELIVERY";
    return this.safely(async () => {
      const context = await this.repository.findOrderContextById(id);
      if (!context) return "not_found";
      if (status === "READY" && context.type !== "PICKUP") return "not_applicable";
      if (status === "OUT_FOR_DELIVERY" && context.type !== "DELIVERY") return "not_applicable";
      const message = status === "CONFIRMED"
        ? notificationTemplates.orderConfirmed(context)
        : status === "READY"
          ? notificationTemplates.orderReady(context)
          : notificationTemplates.orderOutForDelivery(context);
      return this.deliver(context, notificationType, message);
    }, notificationType);
  }
}
