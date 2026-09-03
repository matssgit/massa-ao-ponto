import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryAuthRepository } from "../../auth/repositories/in-memory-auth-repository.js";
import { ListRestaurantsUseCase } from "./list-restaurants.use-case.js";

describe("List Restaurants Use Case", () => {
  let repository: InMemoryAuthRepository;
  let sut: ListRestaurantsUseCase;
  beforeEach(() => {
    repository = new InMemoryAuthRepository();
    sut = new ListRestaurantsUseCase(repository);
  });

  it("lists only active user memberships without duplicates, ordered by name and id", async () => {
    const now = new Date();
    repository.restaurants = ["b", "a", "c", "d"].map((id) => ({
      id, name: id === "b" || id === "a" ? "Same" : "Other", address: "", phone: "",
      timezone: "UTC", createdAt: now, updatedAt: now,
    }));
    repository.memberships = [
      { id: "1", userId: "u", restaurantId: "b", role: "OWNER", active: true, createdAt: now, updatedAt: now },
      { id: "2", userId: "u", restaurantId: "a", role: "STAFF", active: true, createdAt: now, updatedAt: now },
      { id: "3", userId: "u", restaurantId: "c", role: "OWNER", active: false, createdAt: now, updatedAt: now },
      { id: "4", userId: "other", restaurantId: "d", role: "OWNER", active: true, createdAt: now, updatedAt: now },
    ];
    expect((await sut.execute("u")).map((item) => item.id)).toEqual(["a", "b"]);
    expect((await sut.execute("other")).map((item) => item.id)).toEqual(["d"]);
  });

  it("returns [] for a user without memberships", async () => {
    expect(await sut.execute("u")).toEqual([]);
  });
});
