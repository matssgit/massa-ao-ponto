import { describe, expect, it } from "vitest";
import type { NotificationAdminRepository, NotificationFilters, NotificationRecord } from "./notification-admin-repository.js";
import { ListNotificationsUseCase, RetryNotificationUseCase } from "./notification-admin-use-cases.js";
import type { NotificationType, OrderNotificationContext } from "./notification-types.js";
import type { WhatsAppMessage, WhatsAppProvider } from "./whatsapp-provider.js";

class MemoryAdminRepository implements NotificationAdminRepository {
  records = new Map<string, NotificationRecord>();
  orders = new Map<string, OrderNotificationContext>();
  async list(input: NotificationFilters) {
    const items = [...this.records.values()].filter(item =>
      item.restaurantId === input.restaurantId && (!input.status || item.status === input.status) && (!input.type || item.type === input.type));
    return { items, total: items.length };
  }
  async findByIdAndRestaurantId(id: string, restaurantId: string) {
    const item = this.records.get(id); return item?.restaurantId === restaurantId ? item : null;
  }
  async claimFailed(id: string, restaurantId: string) {
    const item = await this.findByIdAndRestaurantId(id, restaurantId);
    if (!item || item.status !== "FAILED") return null;
    const updated = { ...item, status: "PENDING" as const, attempts: item.attempts + 1, errorCode: null, updatedAt: new Date() };
    this.records.set(id, updated); return updated;
  }
  async claim() { return null; }
  async markSent(id: string, sentAt: Date) { const item = this.records.get(id); if (item) this.records.set(id, { ...item, status: "SENT", errorCode: null, updatedAt: sentAt }); }
  async markFailed(id: string, errorCode: string) { const item = this.records.get(id); if (item) this.records.set(id, { ...item, status: "FAILED", errorCode, updatedAt: new Date() }); }
  async findOrderContextById(id: string) { return this.orders.get(id) ?? null; }
  async findOrderContextByTokenHash() { return null; }
  async findReservationContextById() { return null; }
  async findReservationContextByTokenHash() { return null; }
  async findReservationReminderCandidateIds() { return []; }
}
class Provider implements WhatsAppProvider {
  messages: WhatsAppMessage[] = []; fail = false;
  async send(message: WhatsAppMessage) { if (this.fail) throw new Error("secret provider response"); this.messages.push(message); }
}
const tenant = "11111111-1111-4111-8111-111111111111";
const resource = "22222222-2222-4222-8222-222222222222";
function record(status: "FAILED" | "SENT" = "FAILED"): NotificationRecord {
  return { id: "33333333-3333-4333-8333-333333333333", restaurantId: tenant, resourceId: resource,
    type: "ORDER_CREATED", status, attempts: 1, errorCode: status === "FAILED" ? "PROVIDER_ERROR" : null,
    createdAt: new Date("2026-09-20T12:00:00Z"), updatedAt: new Date("2026-09-20T12:01:00Z") };
}
function fixture(status: "FAILED" | "SENT" = "FAILED") {
  const repository = new MemoryAdminRepository(); const provider = new Provider(); const item = record(status);
  repository.records.set(item.id, item);
  repository.orders.set(resource, { resourceId: resource, restaurantId: tenant, restaurantName: "Casa", whatsappNotificationsEnabled: true,
    customerName: "Ana", customerPhone: "5511999999999", type: "PICKUP", total: 4500 });
  return { repository, provider, item, useCase: new RetryNotificationUseCase(repository, provider) };
}
describe("Notification admin use cases", () => {
  it("returns a safe filtered page", async () => {
    const { repository, item } = fixture();
    const result = await new ListNotificationsUseCase(repository).execute({ restaurantId: tenant, page: 1, limit: 20, status: "FAILED", type: "ORDER_CREATED" });
    expect(result.meta).toMatchObject({ total: 1, totalPages: 1, hasNext: false });
    expect(result.data[0]).toMatchObject({ id: item.id, status: "FAILED", attempts: 1, errorSummary: "Falha no envio pelo provedor." });
    expect(JSON.stringify(result)).not.toMatch(/phone|message|token|PROVIDER_ERROR/i);
  });
  it("retries the same FAILED record and marks it SENT", async () => {
    const { repository, provider, item, useCase } = fixture();
    await expect(useCase.execute(tenant, item.id)).resolves.toMatchObject({ id: item.id, status: "SENT", attempts: 2 });
    expect(repository.records).toHaveLength(1); expect(provider.messages).toHaveLength(1);
  });
  it("keeps the same record FAILED on provider failure and rejects non-FAILED retry", async () => {
    const failed = fixture(); failed.provider.fail = true;
    await expect(failed.useCase.execute(tenant, failed.item.id)).resolves.toMatchObject({ status: "FAILED", attempts: 2, errorSummary: "Falha no envio pelo provedor." });
    expect(JSON.stringify(await failed.useCase.execute("44444444-4444-4444-8444-444444444444", failed.item.id).catch(error => ({ name: (error as Error).name })))).not.toContain("secret");
    const sent = fixture("SENT");
    await expect(sent.useCase.execute(tenant, sent.item.id)).rejects.toMatchObject({ name: "NotificationRetryConflictError" });
  });
});
