import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../app/app";
import { ApiClient } from "../../lib/api-client";
import { AuthService } from "../auth/auth-service";
import type { NotificationsPageData } from "./notifications-service";

const restaurantId = "11111111-1111-4111-8111-111111111111";
const notificationId = "22222222-2222-4222-8222-222222222222";
const resourceId = "33333333-3333-4333-8333-333333333333";
const timestamp = "2026-09-20T12:00:00.000Z";
const meta = { page: 1, limit: 20, total: 1, totalPages: 1, hasNext: false, hasPrevious: false };
const failed: NotificationsPageData["data"][number] = { id: notificationId, type: "ORDER_CREATED", resourceType: "ORDER", resourceId,
  status: "FAILED", attempts: 1, createdAt: timestamp, lastAttemptAt: timestamp, errorSummary: "Falha no envio pelo provedor." };

function fixture(role: "OWNER" | "STAFF" = "OWNER", retryFailure = false, pending?: Promise<void>) {
  let item = failed;
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input)); const method = init?.method ?? "GET";
    if (url.pathname === "/auth/session") return Response.json({ user: { id: crypto.randomUUID(), email: "owner@example.com" }, memberships: [{ restaurantId, role }], csrfToken: "csrf" });
    if (url.pathname === "/restaurants") return Response.json([{ id: restaurantId, name: "Centro" }]);
    if (url.pathname.includes("/dashboard/")) return url.pathname.endsWith("sales-summary")
      ? Response.json({ period: { startsAt: null, endsAt: null }, orders: { total: 0, paid: 0, pending: 0, delivered: 0, cancelled: 0 }, revenue: 0, averageTicket: 0 })
      : Response.json([]);
    if (method === "GET" && url.pathname.endsWith("/notifications")) return Response.json({ data: [item], meta });
    if (method === "POST" && url.pathname.endsWith("/retry")) {
      await pending;
      item = retryFailure
        ? { ...failed, attempts: 2, errorSummary: "Falha no envio pelo provedor." }
        : { ...failed, status: "SENT", attempts: 2, errorSummary: null };
      return Response.json(item);
    }
    throw new Error(`Unexpected request: ${method} ${url.pathname}`);
  });
  render(<MemoryRouter initialEntries={["/notificacoes"]}><App service={new AuthService(new ApiClient("https://api.example.com", transport))} /></MemoryRouter>);
  return transport;
}

describe("Notification center", () => {
  it("renders the safe OWNER list and refreshes after a successful retry", async () => {
    let release: (() => void) | undefined;
    const pending = new Promise<void>(resolve => { release = resolve; });
    fixture("OWNER", false, pending);
    expect(await screen.findByRole("heading", { name: "Notificações" })).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Pedido recebido" })).toBeTruthy();
    expect(screen.getAllByText("Falhou")).toHaveLength(2);
    expect(screen.getByText("Falha no envio pelo provedor.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Reenviar" }));
    expect(screen.getByRole("button", { name: "Reenviando…" }).hasAttribute("disabled")).toBe(true);
    release?.();
    expect(await screen.findByText("Notificação enviada.")).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText("Enviada")).toHaveLength(2));
  });
  it("shows a sanitized retry failure and allows another explicit attempt", async () => {
    fixture("OWNER", true);
    await userEvent.click(await screen.findByRole("button", { name: "Reenviar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Falha no envio pelo provedor.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Reenviar" })).toBeTruthy());
  });
  it("hides the navigation and never loads admin notification APIs for STAFF", async () => {
    const transport = fixture("STAFF");
    await waitFor(() => expect(screen.queryByRole("link", { name: "Notificações" })).toBeNull());
    expect(transport.mock.calls.filter(([input]) => new URL(String(input)).pathname.includes("/notifications"))).toHaveLength(0);
  });
});
