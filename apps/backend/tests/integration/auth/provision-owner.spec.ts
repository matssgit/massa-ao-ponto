import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { db } from "../../../src/db/index.js";
import { restaurantMemberships, restaurants, sessions, users } from "../../../src/db/schema/index.js";
import { OwnerEmailAlreadyExistsError, OwnerMembershipAlreadyExistsError } from "../../../src/modules/auth/errors/owner-provisioning-errors.js";
import { Argon2PasswordHasher } from "../../../src/modules/auth/password-hasher.js";
import { DrizzleOwnerProvisioningRepository } from "../../../src/modules/auth/repositories/drizzle-owner-provisioning-repository.js";
import { DrizzleOwnerProvisioningTransactionManager } from "../../../src/modules/auth/transactions/drizzle-owner-provisioning-transaction-manager.js";
import type { OwnerProvisioningRepositories, OwnerProvisioningTransactionManager } from "../../../src/modules/auth/transactions/owner-provisioning-transaction-manager.js";
import { ProvisionOwnerUseCase } from "../../../src/modules/auth/use-cases/provision-owner.use-case.js";

describe("Owner provisioning (PostgreSQL integration, no HTTP)", () => {
  const passwords = new Argon2PasswordHasher();
  const transactions = new DrizzleOwnerProvisioningTransactionManager();
  const sut = new ProvisionOwnerUseCase(transactions, passwords);
  const emails: string[] = [];
  const names: string[] = [];

  function input() {
    const email = `provision-${randomUUID()}@example.com`;
    const name = `provision-${randomUUID()}`;
    emails.push(email);
    names.push(name);
    return { email, password: "test-only-password", restaurant: { name, address: "Test address", phone: "11999999999", timezone: "America/Sao_Paulo" } };
  }

  afterEach(async () => {
    if (emails.length) await db.delete(users).where(inArray(users.email, emails));
    if (names.length) await db.delete(restaurants).where(inArray(restaurants.name, names));
    emails.length = 0;
    names.length = 0;
  });

  afterAll(async () => { await db.$client.end({ timeout: 5 }); });

  it("persists canonical active User, Restaurant, active OWNER and no session", async () => {
    const data = input();
    const result = await sut.execute({ ...data, email: `  ${data.email.toUpperCase()}  ` });
    const [user] = await db.select().from(users).where(eq(users.id, result.userId));
    expect(user).toMatchObject({ email: data.email, active: true });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await passwords.verify(user.passwordHash, data.password)).toBe(true);
    expect(JSON.stringify(user)).not.toContain(data.password);
    expect(await db.select().from(restaurants).where(eq(restaurants.id, result.restaurantId)))
      .toEqual([expect.objectContaining(data.restaurant)]);
    expect(await db.select().from(restaurantMemberships).where(eq(restaurantMemberships.userId, result.userId)))
      .toEqual([expect.objectContaining({ id: result.membershipId, restaurantId: result.restaurantId, role: "OWNER", active: true })]);
    expect(await db.select().from(sessions).where(eq(sessions.userId, result.userId))).toEqual([]);
    expect(Object.keys(result).sort()).toEqual(["membershipId", "restaurantId", "userId"]);
  });

  it.each([true, false])("rejects existing email without account adoption (active=%s)", async (active) => {
    const data = input();
    const result = await sut.execute(data);
    await db.update(users).set({ active }).where(eq(users.id, result.userId));
    const before = await db.select().from(users).where(eq(users.id, result.userId));
    await expect(sut.execute({ ...data, email: data.email.toUpperCase(), password: "another-test-password" })).rejects.toBeInstanceOf(OwnerEmailAlreadyExistsError);
    expect(await db.select().from(users).where(eq(users.id, result.userId))).toEqual(before);
    expect(await db.select().from(restaurants).where(eq(restaurants.name, data.restaurant.name))).toHaveLength(1);
    expect(await db.select().from(restaurantMemberships).where(eq(restaurantMemberships.userId, result.userId))).toHaveLength(1);
  });

  it("allows two distinct restaurants with the same name", async () => {
    const first = input();
    const second = input();
    const a = await sut.execute(first);
    const b = await sut.execute({ ...second, restaurant: first.restaurant });
    expect(a.restaurantId).not.toBe(b.restaurantId);
    expect(await db.select().from(restaurants).where(eq(restaurants.name, first.restaurant.name))).toHaveLength(2);
  });

  it("database uniqueness permits only one complete provisioning for concurrent identical email", async () => {
    const data = input();
    const results = await Promise.allSettled([sut.execute(data), sut.execute(data)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason instanceof OwnerEmailAlreadyExistsError).toBe(true);
    const persisted = await db.select().from(users).where(eq(users.email, data.email));
    expect(persisted).toHaveLength(1);
    expect(await db.select().from(restaurants).where(eq(restaurants.name, data.restaurant.name))).toHaveLength(1);
    expect(await db.select().from(restaurantMemberships).where(eq(restaurantMemberships.userId, persisted[0].id))).toHaveLength(1);
  });

  it.each([false, true])("rolls back all records after membership write (duplicate=%s)", async (duplicate) => {
    const data = input();
    let userId = "";
    let restaurantId = "";
    const failingTransactions: OwnerProvisioningTransactionManager = {
      execute<T>(work: (repositories: OwnerProvisioningRepositories) => Promise<T>): Promise<T> {
        return transactions.execute((repositories) => work({
          restaurants: repositories.restaurants,
          owner: {
            createUser: (value) => repositories.owner.createUser(value),
            async createOwnerMembership(value) {
              userId = value.userId;
              restaurantId = value.restaurantId;
              await repositories.owner.createOwnerMembership(value);
              if (duplicate) return repositories.owner.createOwnerMembership(value);
              throw new Error("failure after all inserts");
            },
          },
        }));
      },
    };
    await expect(new ProvisionOwnerUseCase(failingTransactions, passwords).execute(data))
      .rejects.toThrow(duplicate ? OwnerMembershipAlreadyExistsError : "failure after all inserts");
    expect(userId).not.toBe("");
    expect(restaurantId).not.toBe("");
    expect(await db.select().from(users).where(eq(users.email, data.email))).toEqual([]);
    expect(await db.select().from(restaurants).where(eq(restaurants.id, restaurantId))).toEqual([]);
    expect(await db.select().from(restaurantMemberships).where(eq(restaurantMemberships.userId, userId))).toEqual([]);
    expect(await db.select().from(sessions).where(eq(sessions.userId, userId))).toEqual([]);
  });

  it("reports duplicate membership without replacing the existing record", async () => {
    const result = await sut.execute(input());
    const before = await db.select().from(restaurantMemberships).where(eq(restaurantMemberships.id, result.membershipId));
    await expect(new DrizzleOwnerProvisioningRepository().createOwnerMembership(result)).rejects.toBeInstanceOf(OwnerMembershipAlreadyExistsError);
    expect(await db.select().from(restaurantMemberships).where(eq(restaurantMemberships.id, result.membershipId))).toEqual(before);
  });
});
