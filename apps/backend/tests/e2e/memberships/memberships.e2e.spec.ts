import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "../../../src/db/index.js";
import {
  memberInvitations,
  restaurantMemberships,
  restaurants,
  users,
} from "../../../src/db/schema/index.js";
import { hashInvitationToken } from "../../../src/modules/auth/invitation-tokens.js";
import { Argon2PasswordHasher } from "../../../src/modules/auth/password-hasher.js";
import { DrizzleMembershipRepository } from "../../../src/modules/auth/repositories/drizzle-membership-repository.js";
import type { MembershipTransactionManager } from "../../../src/modules/auth/transactions/membership-transaction-manager.js";
import { DrizzleMembershipTransactionManager } from "../../../src/modules/auth/transactions/drizzle-membership-transaction-manager.js";
import { AcceptNewUserInvitationUseCase } from "../../../src/modules/auth/use-cases/accept-new-user-invitation.use-case.js";
import { UpdateMembershipUseCase } from "../../../src/modules/auth/use-cases/update-membership.use-case.js";
import { app } from "../../../src/server.js";
import { TestAuth, useTestAuth } from "../../helpers/auth.js";

interface CreatedInvitation {
  invitation: { id: string; email: string; expiresAt: string };
  token: string;
}

describe("Membership administration and invitations (E2E)", () => {
  const owner = useTestAuth(app);
  const extraUsers: string[] = [];
  let restaurantId: string;
  let otherRestaurantId: string;
  let secondary: TestAuth | undefined;

  beforeAll(async () => { await app.ready(); });
  afterAll(async () => { await app.close(); });

  beforeEach(async () => {
    restaurantId = (await owner.createRestaurant({ name: "Members", address: "Test", timezone: "UTC" })).id;
    otherRestaurantId = (await db.insert(restaurants).values({
      name: "Other members", address: "Test", timezone: "UTC",
    }).returning())[0].id;
  });

  afterEach(async () => {
    await db.delete(memberInvitations).where(inArray(memberInvitations.restaurantId, [restaurantId, otherRestaurantId]));
    await secondary?.cleanup();
    secondary = undefined;
    if (extraUsers.length) await db.delete(users).where(inArray(users.id, extraUsers));
    extraUsers.length = 0;
    await db.delete(restaurants).where(inArray(restaurants.id, [restaurantId, otherRestaurantId]));
  });

  const url = (suffix: string) => `/restaurants/${restaurantId}${suffix}`;

  async function invite(email: string, targetRestaurantId = restaurantId) {
    const response = await app.inject({
      method: "POST",
      url: `/restaurants/${targetRestaurantId}/member-invitations`,
      headers: owner.headers,
      payload: { email },
    });
    expect(response.statusCode).toBe(201);
    return response.json<CreatedInvitation>();
  }

  async function insertUser(email: string, password = "existing-password") {
    const passwordHash = await new Argon2PasswordHasher().hash(password);
    const [user] = await db.insert(users).values({ email, passwordHash }).returning();
    extraUsers.push(user.id);
    return { user, passwordHash, password };
  }

  it("lists only tenant members with deterministic pagination and no secrets", async () => {
    const first = await insertUser("a-member@example.com");
    const second = await insertUser("z-member@example.com");
    await db.insert(restaurantMemberships).values([
      { restaurantId, userId: second.user.id, role: "STAFF" },
      { restaurantId, userId: first.user.id, role: "STAFF" },
      { restaurantId: otherRestaurantId, userId: first.user.id, role: "OWNER" },
    ]);
    const response = await app.inject({ method: "GET", url: url("/members?page=1&limit=2"), headers: owner.headers });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ data: Array<{ user: { email: string } }>; meta: { total: number; totalPages: number; hasNext: boolean } }>();
    const expectedEmails = ["a-member@example.com", owner.userId + "@e2e.example", "z-member@example.com"].sort();
    expect(body.data.map((member) => member.user.email)).toEqual(expectedEmails.slice(0, 2));
    expect(body.meta).toMatchObject({ total: 3, totalPages: 2, hasNext: true });
    expect(response.body).not.toContain("passwordHash");
    expect(response.body).not.toContain("tokenHash");
    expect(response.body).not.toContain("sessions");
  });

  it("enforces OWNER policy and tenant-scoped member lookup", async () => {
    await owner.grant(restaurantId, "STAFF");
    expect((await app.inject({ method: "GET", url: url("/members"), headers: owner.headers })).statusCode).toBe(403);
    await owner.grant(restaurantId, "OWNER");
    const response = await app.inject({
      method: "PATCH",
      url: url(`/members/${randomUUID()}`),
      headers: owner.headers,
      payload: { role: "STAFF" },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe("MEMBER_NOT_FOUND");
  });

  it("promotes, activates, deactivates and immediately revalidates role/session memberships", async () => {
    secondary = new TestAuth(app);
    await secondary.login();
    await secondary.grant(restaurantId, "STAFF", false);
    const [membership] = await db.select().from(restaurantMemberships).where(and(
      eq(restaurantMemberships.userId, secondary.userId),
      eq(restaurantMemberships.restaurantId, restaurantId),
    ));
    const patch = async (payload: { role?: "OWNER" | "STAFF"; active?: boolean }) => app.inject({
      method: "PATCH", url: url(`/members/${membership.id}`), headers: owner.headers, payload,
    });
    expect((await patch({ active: true })).statusCode).toBe(200);
    expect((await patch({ role: "OWNER" })).json()).toMatchObject({ role: "OWNER", active: true });
    expect((await app.inject({ method: "GET", url: url("/members"), headers: secondary.headers })).statusCode).toBe(200);
    expect((await patch({ role: "STAFF" })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: url("/members"), headers: secondary.headers })).statusCode).toBe(403);
    expect((await patch({ active: false })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: `/restaurants/${restaurantId}`, headers: secondary.headers })).statusCode).toBe(404);
    const session = await app.inject({ method: "GET", url: "/auth/session", headers: secondary.headers });
    expect(session.statusCode).toBe(200);
    expect(session.json<{ memberships: Array<{ restaurantId: string }> }>().memberships).toEqual([]);
  });

  it("protects the last active OWNER but allows self-demotion when another OWNER exists", async () => {
    const [ownMembership] = await db.select().from(restaurantMemberships).where(and(
      eq(restaurantMemberships.userId, owner.userId),
      eq(restaurantMemberships.restaurantId, restaurantId),
    ));
    const denied = await app.inject({
      method: "PATCH", url: url(`/members/${ownMembership.id}`), headers: owner.headers,
      payload: { role: "STAFF" },
    });
    expect(denied.statusCode).toBe(409);
    expect(denied.json().code).toBe("LAST_ACTIVE_OWNER");
    const other = await insertUser("other-owner@example.com");
    await db.insert(restaurantMemberships).values({ restaurantId, userId: other.user.id, role: "OWNER" });
    expect((await app.inject({
      method: "PATCH", url: url(`/members/${ownMembership.id}`), headers: owner.headers,
      payload: { role: "STAFF" },
    })).statusCode).toBe(200);
  });

  it("serializes concurrent OWNER reductions and preserves one active OWNER", async () => {
    const other = await insertUser("concurrent-owner@example.com");
    const [otherMembership] = await db.insert(restaurantMemberships).values({
      restaurantId, userId: other.user.id, role: "OWNER",
    }).returning();
    const [ownMembership] = await db.select().from(restaurantMemberships).where(and(
      eq(restaurantMemberships.userId, owner.userId), eq(restaurantMemberships.restaurantId, restaurantId),
    ));
    const useCase = () => new UpdateMembershipUseCase(new DrizzleMembershipTransactionManager());
    const settled = await Promise.allSettled([
      useCase().execute({ restaurantId, membershipId: ownMembership.id, role: "STAFF" }),
      useCase().execute({ restaurantId, membershipId: otherMembership.id, active: false }),
    ]);
    expect(settled.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(settled.filter((result) => result.status === "rejected")).toHaveLength(1);
    const activeOwners = await db.select().from(restaurantMemberships).where(and(
      eq(restaurantMemberships.restaurantId, restaurantId),
      eq(restaurantMemberships.role, "OWNER"),
      eq(restaurantMemberships.active, true),
    ));
    expect(activeOwners).toHaveLength(1);
  });

  it("creates canonical STAFF invitations, returns raw token once and persists only its hash", async () => {
    const before = Date.now();
    const result = await invite("  NEW.STAFF@EXAMPLE.COM  ");
    expect(result.invitation.email).toBe("new.staff@example.com");
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(new Date(result.invitation.expiresAt).getTime() - before).toBeGreaterThan(604_000_000);
    const [stored] = await db.select().from(memberInvitations).where(eq(memberInvitations.id, result.invitation.id));
    expect(stored.role).toBe("STAFF");
    expect(stored.createdByUserId).toBe(owner.userId);
    expect(stored.tokenHash).toBe(hashInvitationToken(result.token));
    expect(JSON.stringify(stored)).not.toContain(result.token);
    const listed = await app.inject({ method: "GET", url: url("/member-invitations"), headers: owner.headers });
    expect(listed.statusCode).toBe(200);
    expect(listed.body).not.toContain(result.token);
    expect(listed.body).not.toContain(stored.tokenHash);
  });

  it("rejects duplicate pending invitations and same-tenant members without revealing global users", async () => {
    const global = await insertUser("global-private@example.com");
    await db.insert(restaurantMemberships).values({
      restaurantId: otherRestaurantId, userId: global.user.id, role: "OWNER",
    });
    expect((await app.inject({
      method: "POST", url: url("/member-invitations"), headers: owner.headers,
      payload: { email: global.user.email },
    })).statusCode).toBe(201);
    const duplicate = await app.inject({
      method: "POST", url: url("/member-invitations"), headers: owner.headers,
      payload: { email: global.user.email },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().code).toBe("INVITATION_ALREADY_PENDING");
    await db.insert(restaurantMemberships).values({ restaurantId, userId: global.user.id, role: "STAFF" });
    const member = await app.inject({
      method: "POST", url: url("/member-invitations"), headers: owner.headers,
      payload: { email: global.user.email },
    });
    expect(member.statusCode).toBe(409);
    expect(member.json().code).toBe("MEMBER_ALREADY_EXISTS");
  });

  it("lists paginated invitations and revokes tenant-aware idempotently", async () => {
    const first = await invite("first-invite@example.com");
    await invite("second-invite@example.com");
    const list = await app.inject({ method: "GET", url: url("/member-invitations?page=1&limit=1"), headers: owner.headers });
    expect(list.statusCode).toBe(200);
    expect(list.json<{ data: unknown[]; meta: { total: number; totalPages: number } }>()).toMatchObject({
      data: [expect.not.objectContaining({ token: expect.anything(), tokenHash: expect.anything() })],
      meta: { total: 2, totalPages: 2 },
    });
    const endpoint = url(`/member-invitations/${first.invitation.id}`);
    expect((await app.inject({ method: "DELETE", url: endpoint, headers: owner.headers })).statusCode).toBe(204);
    expect((await app.inject({ method: "DELETE", url: endpoint, headers: owner.headers })).statusCode).toBe(204);
    const cross = await app.inject({
      method: "DELETE", url: `/restaurants/${otherRestaurantId}/member-invitations/${first.invitation.id}`,
      headers: owner.headers,
    });
    expect(cross.statusCode).toBe(404);
  });

  it("accepts a new User atomically with Argon2 password and one-time token", async () => {
    const result = await invite("brand-new@example.com");
    const headers = { origin: "http://localhost:5173", "x-auth-request": "1" };
    const accepted = await app.inject({
      method: "POST", url: "/auth/member-invitations/accept", headers,
      payload: { token: result.token, password: "new-secure-password" },
    });
    expect(accepted.statusCode).toBe(201);
    const member = accepted.json<{ user: { id: string; email: string }; role: string; active: boolean }>();
    extraUsers.push(member.user.id);
    expect(member).toMatchObject({ user: { email: "brand-new@example.com" }, role: "STAFF", active: true });
    const [created] = await db.select().from(users).where(eq(users.id, member.user.id));
    expect(created.passwordHash).not.toBe("new-secure-password");
    expect(await new Argon2PasswordHasher().verify(created.passwordHash, "new-secure-password")).toBe(true);
    const repeated = await app.inject({
      method: "POST", url: "/auth/member-invitations/accept", headers,
      payload: { token: result.token, password: "new-secure-password" },
    });
    expect(repeated.statusCode).toBe(409);
    expect(repeated.json().code).toBe("INVITATION_ALREADY_USED");
  });

  it("returns explicit expired and revoked invitation errors", async () => {
    const expired = await invite("expired@example.com");
    await db.update(memberInvitations).set({ expiresAt: new Date(Date.now() - 1) })
      .where(eq(memberInvitations.id, expired.invitation.id));
    const headers = { origin: "http://localhost:5173", "x-auth-request": "1" };
    const expiredResponse = await app.inject({
      method: "POST", url: "/auth/member-invitations/accept", headers,
      payload: { token: expired.token, password: "new-secure-password" },
    });
    expect(expiredResponse.statusCode).toBe(409);
    expect(expiredResponse.json().code).toBe("INVITATION_EXPIRED");
    const revoked = await invite("revoked@example.com");
    await app.inject({
      method: "DELETE", url: url(`/member-invitations/${revoked.invitation.id}`), headers: owner.headers,
    });
    const revokedResponse = await app.inject({
      method: "POST", url: "/auth/member-invitations/accept", headers,
      payload: { token: revoked.token, password: "new-secure-password" },
    });
    expect(revokedResponse.statusCode).toBe(409);
    expect(revokedResponse.json().code).toBe("INVITATION_REVOKED");
  });

  it("accepts an existing matching User without changing password and requires a session", async () => {
    secondary = new TestAuth(app);
    await secondary.login();
    const [existing] = await db.select().from(users).where(eq(users.id, secondary.userId));
    const result = await invite(existing.email);
    expect((await app.inject({
      method: "POST", url: "/member-invitations/accept", payload: { token: result.token },
    })).statusCode).toBe(401);
    const accepted = await app.inject({
      method: "POST", url: "/member-invitations/accept", headers: secondary.headers,
      payload: { token: result.token },
    });
    expect(accepted.statusCode).toBe(201);
    const [after] = await db.select().from(users).where(eq(users.id, secondary.userId));
    expect(after.passwordHash).toBe(existing.passwordHash);
    expect((await app.inject({ method: "GET", url: `/restaurants/${restaurantId}`, headers: secondary.headers })).statusCode).toBe(200);
  });

  it("rejects an email mismatch and preserves invitation and membership state", async () => {
    secondary = new TestAuth(app);
    await secondary.login();
    const result = await invite("different-user@example.com");
    const response = await app.inject({
      method: "POST", url: "/member-invitations/accept", headers: secondary.headers,
      payload: { token: result.token },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("INVITATION_INVALID");
    const [invitation] = await db.select().from(memberInvitations).where(eq(memberInvitations.id, result.invitation.id));
    expect(invitation.acceptedAt).toBeNull();
    expect(await db.select().from(restaurantMemberships).where(and(
      eq(restaurantMemberships.userId, secondary.userId),
      eq(restaurantMemberships.restaurantId, restaurantId),
    ))).toEqual([]);
  });

  it("allows only one concurrent accept and creates one User and membership", async () => {
    const result = await invite("concurrent-accept@example.com");
    const headers = { origin: "http://localhost:5173", "x-auth-request": "1" };
    const responses = await Promise.all([
      app.inject({ method: "POST", url: "/auth/member-invitations/accept", headers, payload: { token: result.token, password: "new-secure-password" } }),
      app.inject({ method: "POST", url: "/auth/member-invitations/accept", headers, payload: { token: result.token, password: "new-secure-password" } }),
    ]);
    expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 409]);
    const created = await db.select().from(users).where(eq(users.email, "concurrent-accept@example.com"));
    expect(created).toHaveLength(1);
    extraUsers.push(created[0].id);
    expect(await db.select().from(restaurantMemberships).where(and(
      eq(restaurantMemberships.userId, created[0].id),
      eq(restaurantMemberships.restaurantId, restaurantId),
    ))).toHaveLength(1);
  });

  it("rolls back User and membership when acceptance fails after persistence", async () => {
    const result = await invite("rollback-accept@example.com");
    class FailingRepository extends DrizzleMembershipRepository {
      override async acceptInvitation(): Promise<void> { throw new Error("forced acceptance failure"); }
    }
    const failingTransactions: MembershipTransactionManager = {
      execute: (work) => db.transaction((tx) => work(new FailingRepository(tx))),
    };
    const useCase = new AcceptNewUserInvitationUseCase(
      new DrizzleMembershipRepository(), failingTransactions, new Argon2PasswordHasher(),
    );
    await expect(useCase.execute({ token: result.token, password: "new-secure-password" }))
      .rejects.toThrow("forced acceptance failure");
    expect(await db.select().from(users).where(eq(users.email, "rollback-accept@example.com"))).toEqual([]);
    const [invitation] = await db.select().from(memberInvitations).where(eq(memberInvitations.id, result.invitation.id));
    expect(invitation.acceptedAt).toBeNull();
  });
  it("validates strict payloads and protects every administrative invitation route", async () => {
    const invitation = await invite("policy@example.com");
    await owner.grant(restaurantId, "STAFF");
    for (const request of [
      { method: "GET" as const, url: url("/members") },
      { method: "POST" as const, url: url("/member-invitations"), payload: { email: "staff@example.com" } },
      { method: "GET" as const, url: url("/member-invitations") },
      { method: "DELETE" as const, url: url(`/member-invitations/${invitation.invitation.id}`) },
    ]) {
      expect((await app.inject({ ...request, headers: owner.headers })).statusCode).toBe(403);
    }
    await owner.grant(restaurantId, "OWNER");
    const [membership] = await db.select().from(restaurantMemberships).where(and(
      eq(restaurantMemberships.userId, owner.userId), eq(restaurantMemberships.restaurantId, restaurantId),
    ));
    expect((await app.inject({
      method: "PATCH", url: url(`/members/${membership.id}`), headers: owner.headers, payload: {},
    })).statusCode).toBe(400);
    expect((await app.inject({
      method: "PATCH", url: url(`/members/${membership.id}`), headers: owner.headers,
      payload: { role: "STAFF", unexpected: true },
    })).statusCode).toBe(400);
  });

  it("does not expose a global existing User through new-user acceptance or change its password", async () => {
    const global = await insertUser("existing-global@example.com");
    await db.insert(restaurantMemberships).values({
      restaurantId: otherRestaurantId, userId: global.user.id, role: "STAFF",
    });
    const result = await invite(global.user.email);
    const response = await app.inject({
      method: "POST", url: "/auth/member-invitations/accept",
      headers: { origin: "http://localhost:5173", "x-auth-request": "1" },
      payload: { token: result.token, password: "attacker-password" },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ code: "INVITATION_INVALID", message: "The invitation is invalid." });
    const [unchanged] = await db.select().from(users).where(eq(users.id, global.user.id));
    expect(unchanged.passwordHash).toBe(global.passwordHash);
    const [invitation] = await db.select().from(memberInvitations).where(eq(memberInvitations.id, result.invitation.id));
    expect(invitation.acceptedAt).toBeNull();
  });

  it("keeps an invitation pending when membership appears before acceptance", async () => {
    secondary = new TestAuth(app);
    await secondary.login();
    const [existing] = await db.select().from(users).where(eq(users.id, secondary.userId));
    const result = await invite(existing.email);
    await secondary.grant(restaurantId, "STAFF");
    const response = await app.inject({
      method: "POST", url: "/member-invitations/accept", headers: secondary.headers,
      payload: { token: result.token },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("MEMBER_ALREADY_EXISTS");
    const [invitation] = await db.select().from(memberInvitations).where(eq(memberInvitations.id, result.invitation.id));
    expect(invitation.acceptedAt).toBeNull();
    expect(await db.select().from(restaurantMemberships).where(and(
      eq(restaurantMemberships.userId, secondary.userId),
      eq(restaurantMemberships.restaurantId, restaurantId),
    ))).toHaveLength(1);
  });

  it("rejects revocation of an accepted invitation without deleting history", async () => {
    const result = await invite("accepted-revoke@example.com");
    const accepted = await app.inject({
      method: "POST", url: "/auth/member-invitations/accept",
      headers: { origin: "http://localhost:5173", "x-auth-request": "1" },
      payload: { token: result.token, password: "new-secure-password" },
    });
    const member = accepted.json<{ user: { id: string } }>();
    extraUsers.push(member.user.id);
    const response = await app.inject({
      method: "DELETE", url: url(`/member-invitations/${result.invitation.id}`), headers: owner.headers,
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("INVITATION_ALREADY_USED");
    const [invitation] = await db.select().from(memberInvitations).where(eq(memberInvitations.id, result.invitation.id));
    expect(invitation.acceptedAt).not.toBeNull();
    expect(invitation.revokedAt).toBeNull();
  });
});
