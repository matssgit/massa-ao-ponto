import type { NotificationRepository } from "./notification-repository.js";
import type { NotificationStatus, NotificationType } from "./notification-types.js";
export interface NotificationRecord {
  id: string; restaurantId: string; resourceId: string; type: NotificationType;
  status: NotificationStatus; attempts: number; errorCode: string | null;
  createdAt: Date; updatedAt: Date;
}
export interface NotificationFilters {
  restaurantId: string; page: number; limit: number;
  status?: NotificationStatus; type?: NotificationType;
}
export interface NotificationAdminRepository extends NotificationRepository {
  list(input: NotificationFilters): Promise<{ items: NotificationRecord[]; total: number }>;
  findByIdAndRestaurantId(id: string, restaurantId: string): Promise<NotificationRecord | null>;
  claimFailed(id: string, restaurantId: string): Promise<NotificationRecord | null>;
}
const summaries: Record<string, string> = {
  PROVIDER_ERROR: "Falha no envio pelo provedor.",
  RESOURCE_UNAVAILABLE: "Recurso indisponível para reenvio.",
  NOTIFICATIONS_DISABLED: "Notificações desativadas neste restaurante.",
};
export function notificationAdminView(record: NotificationRecord) {
  return {
    id: record.id, type: record.type,
    resourceType: record.type.startsWith("ORDER_") ? "ORDER" as const : "RESERVATION" as const,
    resourceId: record.resourceId, status: record.status, attempts: record.attempts,
    createdAt: record.createdAt, lastAttemptAt: record.updatedAt,
    errorSummary: record.status === "FAILED" ? summaries[record.errorCode ?? ""] ?? "Falha técnica no envio." : null,
  };
}
