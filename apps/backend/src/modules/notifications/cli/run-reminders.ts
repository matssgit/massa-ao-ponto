import { closeDatabase } from "../../../db/index.js";
import { DevelopmentWhatsAppProvider } from "../development-whatsapp-provider.js";
import { DrizzleNotificationRepository } from "../drizzle-notification-repository.js";
import { readNotificationConfig } from "../notification-config.js";
import { RunReservationReminders } from "../run-reservation-reminders.js";
import { WhatsAppNotificationService } from "../whatsapp-notification-service.js";

async function main() {
  const repository = new DrizzleNotificationRepository();
  const config = readNotificationConfig();
  const notifications = new WhatsAppNotificationService(
    repository,
    new DevelopmentWhatsAppProvider(),
    { publicWebUrl: config.publicWebUrl },
  );
  const summary = await new RunReservationReminders(repository, notifications).execute();
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

main()
  .catch(() => {
    process.stderr.write("Reservation reminder execution failed.\n");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
