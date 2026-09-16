import { DevelopmentWhatsAppProvider, type NotificationLogger } from "./development-whatsapp-provider.js";
import { DrizzleNotificationRepository } from "./drizzle-notification-repository.js";
import { readNotificationConfig } from "./notification-config.js";
import { WhatsAppNotificationService } from "./whatsapp-notification-service.js";

const notificationConfig = readNotificationConfig();

export function makeWhatsAppNotificationService(logger?: NotificationLogger) {
  return new WhatsAppNotificationService(
    new DrizzleNotificationRepository(),
    new DevelopmentWhatsAppProvider(logger),
    { publicWebUrl: notificationConfig.publicWebUrl, logger },
  );
}
