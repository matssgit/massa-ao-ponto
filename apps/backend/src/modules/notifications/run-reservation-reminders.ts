import type { NotificationRepository } from "./notification-repository.js";
import type { WhatsAppNotificationService } from "./whatsapp-notification-service.js";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

export class RunReservationReminders {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly notifications: WhatsAppNotificationService,
  ) {}

  async execute(now = new Date()) {
    const ids = await this.repository.findReservationReminderCandidateIds({
      startsAt: new Date(now.getTime() + TWO_HOURS_MS),
      endsAt: new Date(now.getTime() + FOUR_HOURS_MS),
    });
    const summary = { candidates: ids.length, sent: 0, skipped: 0, failed: 0 };
    for (const id of ids) {
      const outcome = await this.notifications.notifyReservationReminder(id);
      if (outcome === "sent") summary.sent += 1;
      else if (outcome === "failed") summary.failed += 1;
      else summary.skipped += 1;
    }
    return summary;
  }
}
