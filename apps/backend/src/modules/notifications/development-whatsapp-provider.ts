import type { WhatsAppMessage, WhatsAppProvider } from "./whatsapp-provider.js";

export interface NotificationLogger {
  info(data: Record<string, unknown>, message: string): void;
  error(data: Record<string, unknown>, message: string): void;
}

export class DevelopmentWhatsAppProvider implements WhatsAppProvider {
  constructor(private readonly logger?: NotificationLogger) {}

  async send(message: WhatsAppMessage) {
    this.logger?.info(
      { notificationType: message.type, provider: "development" },
      "WhatsApp notification accepted by development provider.",
    );
  }
}
