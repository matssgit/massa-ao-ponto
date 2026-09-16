import type { NotificationType } from "./notification-types.js";

export interface WhatsAppMessage {
  recipientPhone: string;
  message: string;
  type: NotificationType;
}

export interface WhatsAppProvider {
  send(message: WhatsAppMessage): Promise<void>;
}
