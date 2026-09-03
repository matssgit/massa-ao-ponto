import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryAuthRepository } from "../repositories/in-memory-auth-repository.js";
import { AuthorizeRestaurantUseCase } from "./authorize-restaurant.use-case.js";
import { ForbiddenError } from "../errors/auth-errors.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";

describe("Authorize Restaurant", () => {
  let repository: InMemoryAuthRepository;
  let authorize: AuthorizeRestaurantUseCase;
  beforeEach(() => {
    const now = new Date();
    repository = new InMemoryAuthRepository();
    repository.restaurants.push({
      id: "restaurant", name: "R", address: "", phone: "", timezone: "UTC",
      createdAt: now, updatedAt: now,
    });
    repository.memberships.push({
      id: "membership", userId: "user", restaurantId: "restaurant",
      role: "OWNER", active: true, createdAt: now, updatedAt: now,
    });
    authorize = new AuthorizeRestaurantUseCase(repository);
  });

  it("returns a typed context using one scoped membership lookup", async () => {
    const lookup = vi.spyOn(repository, "findActiveMembership");
    expect(await authorize.execute("user", "restaurant", true)).toEqual({
      userId: "user", restaurantId: "restaurant", role: "OWNER",
    });
    expect(lookup).toHaveBeenCalledExactlyOnceWith("user", "restaurant");
  });

  it.each(["other user", "other tenant", "inactive", "missing restaurant"] as const)(
    "hides inaccessible Restaurant: %s", async (scenario) => {
      if (scenario === "inactive") repository.memberships[0].active = false;
      if (scenario === "missing restaurant") repository.restaurants = [];
      await expect(authorize.execute(
        scenario === "other user" ? "other" : "user",
        scenario === "other tenant" ? "other" : "restaurant",
        true,
      )).rejects.toEqual(new RestaurantNotFoundError());
    },
  );

  it("allows STAFF operation but rejects OWNER-only access", async () => {
    repository.memberships[0].role = "STAFF";
    expect(await authorize.execute("user", "restaurant", false)).toEqual({
      userId: "user", restaurantId: "restaurant", role: "STAFF",
    });
    await expect(authorize.execute("user", "restaurant", true)).rejects.toEqual(new ForbiddenError());
  });
});
