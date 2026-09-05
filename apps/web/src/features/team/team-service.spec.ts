import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../lib/api-client";
import {
  existingInvitationAcceptanceSchema,
  invitationSchema,
  memberSchema,
  newInvitationAcceptanceSchema,
  TeamService,
} from "./team-service";

const restaurantId = "11111111-1111-4111-8111-111111111111";
const membershipId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const invitationId = "44444444-4444-4444-8444-444444444444";
const timestamp = "2026-09-04T12:00:00.000Z";
const token = "a".repeat(43);
const member = { id: membershipId, user: { id: userId, email: "staff@example.com" }, role: "STAFF", active: true, createdAt: timestamp, updatedAt: timestamp } as const;
const invitation = { id: invitationId, email: "staff@example.com", role: "STAFF", createdAt: timestamp, expiresAt: "2026-09-11T12:00:00.000Z", acceptedAt: null, revokedAt: null } as const;
const meta = { page: 1, limit: 20, total: 1, totalPages: 1, hasNext: false, hasPrevious: false };

function serviceWith(response: unknown, status = 200) {
  const transport = vi.fn<typeof fetch>(async () => Response.json(response, { status }));
  const client = new ApiClient("https://api.example.com", transport);
  client.setCsrfToken("team-csrf");
  return { service: new TeamService(client), transport };
}

describe("TeamService", () => {
  it("validates minimal member and invitation contracts strictly", () => {
    expect(memberSchema.parse(member)).toEqual(member);
    expect(invitationSchema.parse(invitation)).toEqual(invitation);
    expect(() => memberSchema.parse({ ...member, passwordHash: "secret" })).toThrow();
    expect(() => invitationSchema.parse({ ...invitation, tokenHash: "secret" })).toThrow();
  });

  it("lists paginated members and preserves the server order", async () => {
    const second = { ...member, id: crypto.randomUUID(), user: { id: crypto.randomUUID(), email: "owner@example.com" }, role: "OWNER" as const };
    const { service, transport } = serviceWith({ data: [member, second], meta: { ...meta, total: 2 } });
    const result = await service.listMembers(restaurantId, 2, 50);
    expect(result.data.map((item) => item.user.email)).toEqual(["staff@example.com", "owner@example.com"]);
    expect(String(transport.mock.calls[0][0])).toBe(`https://api.example.com/restaurants/${restaurantId}/members?page=2&limit=50`);
  });

  it("updates only role/active with PATCH and CSRF", async () => {
    const { service, transport } = serviceWith({ ...member, role: "OWNER", active: false });
    await service.updateMember(restaurantId, membershipId, { role: "OWNER", active: false });
    expect(transport.mock.calls[0][1]).toMatchObject({ method: "PATCH", body: JSON.stringify({ role: "OWNER", active: false }) });
    expect(new Headers(transport.mock.calls[0][1]?.headers).get("X-CSRF-Token")).toBe("team-csrf");
  });

  it("lists invitations without accepting token fields in the response", async () => {
    const valid = serviceWith({ data: [invitation], meta });
    expect((await valid.service.listInvitations(restaurantId, 1)).data[0].email).toBe("staff@example.com");
    const leaked = serviceWith({ data: [{ ...invitation, tokenHash: "secret" }], meta });
    await expect(leaked.service.listInvitations(restaurantId, 1)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("canonicalizes invite email and returns the one-time token", async () => {
    const { service, transport } = serviceWith({ invitation, token }, 201);
    expect((await service.createInvitation(restaurantId, " Staff@Example.COM ")).token).toBe(token);
    expect(transport.mock.calls[0][1]?.body).toBe(JSON.stringify({ email: "staff@example.com" }));
  });

  it("uses soft-revoke HTTP endpoint and sends no body", async () => {
    const transport = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    const client = new ApiClient("https://api.example.com", transport); client.setCsrfToken("team-csrf");
    await new TeamService(client).revokeInvitation(restaurantId, invitationId);
    expect(transport.mock.calls[0][1]).toMatchObject({ method: "DELETE", body: undefined });
  });

  it("accepts a new User without CSRF and does not send confirmation password", async () => {
    const { service, transport } = serviceWith(member, 201);
    await service.acceptNewUser(token, "a-secure-password");
    expect(transport.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify({ token, password: "a-secure-password" }) });
    expect(new Headers(transport.mock.calls[0][1]?.headers).get("X-CSRF-Token")).toBeNull();
  });

  it("accepts an existing User with session CSRF and no password", async () => {
    const { service, transport } = serviceWith(member, 201);
    await service.acceptExistingUser(token);
    expect(transport.mock.calls[0][1]?.body).toBe(JSON.stringify({ token }));
    expect(new Headers(transport.mock.calls[0][1]?.headers).get("X-CSRF-Token")).toBe("team-csrf");
  });

  it("validates password confirmation only on the client", () => {
    expect(newInvitationAcceptanceSchema.safeParse({ token, password: "a-secure-password", passwordConfirmation: "different-value" }).success).toBe(false);
    expect(existingInvitationAcceptanceSchema.parse({ token })).toEqual({ token });
  });
});