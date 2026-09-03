import { beforeEach, describe, expect, it, vi } from "vitest";
import { OwnerEmailAlreadyExistsError, OwnerMembershipAlreadyExistsError, InvalidOwnerProvisioningInputError } from "../errors/owner-provisioning-errors.js";
import { Argon2PasswordHasher, type PasswordHasher } from "../password-hasher.js";
import { InMemoryOwnerProvisioningTransactionManager } from "../transactions/in-memory-owner-provisioning-transaction-manager.js";
import { ProvisionOwnerUseCase } from "./provision-owner.use-case.js";

describe("ProvisionOwnerUseCase", () => {
  const input = {
    email: "  OWNER@EXAMPLE.COM  ", password: "test-only-password",
    restaurant: { name: "Test pizzeria", address: "Test address", phone: "11999999999", timezone: "America/Sao_Paulo" },
  };
  let transactions: InMemoryOwnerProvisioningTransactionManager;
  let passwords: PasswordHasher;
  let sut: ProvisionOwnerUseCase;

  beforeEach(() => {
    transactions = new InMemoryOwnerProvisioningTransactionManager();
    passwords = new Argon2PasswordHasher();
    sut = new ProvisionOwnerUseCase(transactions, passwords);
  });

  function expectEmpty() {
    expect(transactions.owner.users).toEqual([]);
    expect(transactions.owner.memberships).toEqual([]);
    expect(transactions.restaurants.items).toEqual([]);
  }

  it("creates an active normalized User, Restaurant and active OWNER with only Argon2id password hash", async () => {
    const result = await sut.execute(input);
    expect(Object.keys(result).sort()).toEqual(["membershipId", "restaurantId", "userId"]);
    expect(transactions.owner.users).toHaveLength(1);
    const user = transactions.owner.users[0];
    expect(user).toMatchObject({ id: result.userId, email: "owner@example.com", active: true });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await passwords.verify(user.passwordHash, input.password)).toBe(true);
    expect(JSON.stringify(user)).not.toContain(input.password);
    expect(transactions.restaurants.items).toEqual([expect.objectContaining({ ...input.restaurant, id: result.restaurantId })]);
    expect(transactions.owner.memberships).toEqual([expect.objectContaining({
      id: result.membershipId, userId: result.userId, restaurantId: result.restaurantId, role: "OWNER", active: true,
    })]);
  });

  it.each([true, false])("rejects existing email without adopting or changing user (active=%s)", async (active) => {
    await sut.execute(input);
    transactions.owner.users[0].active = active;
    const before = structuredClone({ users: transactions.owner.users, memberships: transactions.owner.memberships, restaurants: transactions.restaurants.items });
    await expect(sut.execute({ ...input, password: "different-test-password" })).rejects.toBeInstanceOf(OwnerEmailAlreadyExistsError);
    expect({ users: transactions.owner.users, memberships: transactions.owner.memberships, restaurants: transactions.restaurants.items }).toEqual(before);
  });

  it("allows repeated Restaurant names because the model has no name uniqueness constraint", async () => {
    await sut.execute(input);
    await sut.execute({ ...input, email: "another@example.com" });
    expect(transactions.restaurants.items).toHaveLength(2);
    expect(new Set(transactions.restaurants.items.map((restaurant) => restaurant.id)).size).toBe(2);
    expect(transactions.owner.memberships).toHaveLength(2);
  });

  it.each([
    { ...input, email: "invalid" },
    { ...input, password: "short" },
    { ...input, password: "x".repeat(1025) },
    { ...input, restaurant: { ...input.restaurant, name: "" } },
    { ...input, restaurant: { ...input.restaurant, address: "x".repeat(256) } },
  ])("rejects invalid input before hashing or persistence (%#)", async (invalidInput) => {
    const hash = vi.spyOn(passwords, "hash");
    await expect(sut.execute(invalidInput)).rejects.toBeInstanceOf(InvalidOwnerProvisioningInputError);
    expect(hash).not.toHaveBeenCalled();
    expectEmpty();
  });

  it("persists nothing when hashing fails", async () => {
    vi.spyOn(passwords, "hash").mockRejectedValueOnce(new Error("hash failure"));
    await expect(sut.execute(input)).rejects.toThrow("hash failure");
    expectEmpty();
  });

  it("rolls back User when Restaurant creation fails", async () => {
    vi.spyOn(transactions.restaurants, "create").mockRejectedValueOnce(new Error("restaurant failure"));
    await expect(sut.execute(input)).rejects.toThrow("restaurant failure");
    expectEmpty();
  });

  it("rolls back all three records when a failure occurs after membership creation", async () => {
    const create = transactions.owner.createOwnerMembership.bind(transactions.owner);
    vi.spyOn(transactions.owner, "createOwnerMembership").mockImplementationOnce(async (data) => {
      await create(data);
      throw new Error("late failure");
    });
    await expect(sut.execute(input)).rejects.toThrow("late failure");
    expectEmpty();
  });

  it("rejects duplicate membership without overwriting it", async () => {
    const result = await sut.execute(input);
    const before = structuredClone(transactions.owner.memberships);
    await expect(transactions.owner.createOwnerMembership(result)).rejects.toBeInstanceOf(OwnerMembershipAlreadyExistsError);
    expect(transactions.owner.memberships).toEqual(before);
  });
});
