import { describe, expect, it } from "vitest";
import type { NotificationClaim, NotificationRepository } from "./notification-repository.js";
import type { NotificationStatus, NotificationType, OrderNotificationContext, ReservationNotificationContext } from "./notification-types.js";
import { RunReservationReminders } from "./run-reservation-reminders.js";
import type { WhatsAppMessage, WhatsAppProvider } from "./whatsapp-provider.js";
import { WhatsAppNotificationService } from "./whatsapp-notification-service.js";

class MemoryRepository implements NotificationRepository {
  reservations = new Map<string, ReservationNotificationContext>(); orders = new Map<string, OrderNotificationContext>();
  reminderIds: string[] = []; deliveries = new Map<string, { id: string; status: NotificationStatus; errorCode: string | null }>();
  async claim(input: { restaurantId: string; resourceId: string; type: NotificationType }): Promise<NotificationClaim | null> {
    const key = `${input.type}:${input.resourceId}`; if (this.deliveries.has(key)) return null;
    this.deliveries.set(key, { id: key, status: "PENDING", errorCode: null }); return { id: key };
  }
  async markSent(id: string) { const item = this.deliveries.get(id); if (item) item.status = "SENT"; }
  async markFailed(id: string, errorCode: string) { const item = this.deliveries.get(id); if (item) { item.status = "FAILED"; item.errorCode = errorCode; } }
  async findReservationContextById(id: string) { return this.reservations.get(id) ?? null; }
  async findReservationContextByTokenHash() { return null; }
  async findOrderContextById(id: string) { return this.orders.get(id) ?? null; }
  async findOrderContextByTokenHash() { return null; }
  async findReservationReminderCandidateIds() { return this.reminderIds; }
}
class FakeProvider implements WhatsAppProvider {
  messages: WhatsAppMessage[] = []; fail = false;
  async send(message: WhatsAppMessage) { if (this.fail) throw new Error("unavailable"); this.messages.push(message); }
}
function reservation(enabled = true): ReservationNotificationContext { return {
  resourceId: "11111111-1111-4111-8111-111111111111", restaurantId: "22222222-2222-4222-8222-222222222222",
  restaurantName: "Massa ao Ponto", timezone: "America/Sao_Paulo", whatsappNotificationsEnabled: enabled,
  customerName: "Ana", customerPhone: "5511999999999", people: 2, startsAt: new Date("2026-09-17T22:00:00.000Z"),
}; }
function order(type: "PICKUP" | "DELIVERY" = "PICKUP"): OrderNotificationContext { return {
  resourceId: type === "PICKUP" ? "33333333-3333-4333-8333-333333333333" : "44444444-4444-4444-8444-444444444444",
  restaurantId: "22222222-2222-4222-8222-222222222222", restaurantName: "Massa ao Ponto", whatsappNotificationsEnabled: true,
  customerName: "Ana", customerPhone: "5511999999999", type, total: 4590,
}; }
function fixture() { const repository = new MemoryRepository(); const provider = new FakeProvider(); return { repository, provider, service: new WhatsAppNotificationService(repository, provider, { publicWebUrl: null }) }; }

describe("WhatsAppNotificationService", () => {
  it("sends reservation confirmation only when enabled", async () => {
    const { repository, provider, service } = fixture(); repository.reservations.set("on", reservation());
    repository.reservations.set("off", { ...reservation(false), resourceId: "55555555-5555-4555-8555-555555555555" });
    expect(await service.notifyReservationCreated("on")).toBe("sent"); expect(await service.notifyReservationCreated("off")).toBe("disabled"); expect(provider.messages).toHaveLength(1);
  });
  it("contains and records provider failures", async () => {
    const { repository, provider, service } = fixture(); repository.reservations.set("r", reservation()); provider.fail = true;
    await expect(service.notifyReservationCreated("r")).resolves.toBe("failed"); expect([...repository.deliveries.values()][0]).toMatchObject({ status: "FAILED", errorCode: "PROVIDER_ERROR" });
  });
  it("sends an eligible reminder only once", async () => {
    const { repository, provider, service } = fixture(); repository.reservations.set("r", reservation()); repository.reminderIds = ["r"];
    const job = new RunReservationReminders(repository, service); expect(await job.execute()).toMatchObject({ sent: 1 }); expect(await job.execute()).toMatchObject({ skipped: 1 }); expect(provider.messages).toHaveLength(1);
  });
  it("sends order creation once", async () => {
    const { repository, provider, service } = fixture(); repository.orders.set("o", order()); expect(await service.notifyOrderCreated("o")).toBe("sent"); expect(await service.notifyOrderCreated("o")).toBe("duplicate"); expect(provider.messages.map((item) => item.type)).toEqual(["ORDER_CREATED"]);
  });
  it("sends READY for PICKUP and OUT_FOR_DELIVERY for DELIVERY", async () => {
    const { repository, provider, service } = fixture(); repository.orders.set("p", order()); repository.orders.set("d", order("DELIVERY"));
    expect(await service.notifyOrderStatus("p", "READY")).toBe("sent"); expect(await service.notifyOrderStatus("p", "OUT_FOR_DELIVERY")).toBe("not_applicable"); expect(await service.notifyOrderStatus("d", "OUT_FOR_DELIVERY")).toBe("sent");
    expect(provider.messages.map((item) => item.type)).toEqual(["ORDER_READY", "ORDER_OUT_FOR_DELIVERY"]);
  });
});
