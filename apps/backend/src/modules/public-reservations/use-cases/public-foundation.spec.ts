import { describe, expect, it } from "vitest";
import { InMemoryRestaurantsRepository } from "../../restaurants/repositories/in-memory-restaurants-repository.js";
import { UpdateRestaurantUseCase } from "../../restaurants/use-cases/update-restaurant.use-case.js";
import { InMemoryReservationsRepository } from "../../reservations/repositories/in-memory-reservations-repository.js";
import { createPublicReservationToken, hashPublicReservationToken } from "../../reservations/public-reservation-tokens.js";
import { GetPublicRestaurantUseCase } from "./get-public-restaurant.use-case.js";

describe("Public foundation unit contracts", () => {
  it("canonicalizes slug, requires publication and detects collisions in memory", async () => {
    const repository = new InMemoryRestaurantsRepository();
    const first = await repository.create({ name: "A", address: "Street", phone: "1", timezone: "UTC" });
    const second = await repository.create({ name: "B", address: "Street", phone: "2", timezone: "UTC" });
    const update = new UpdateRestaurantUseCase(repository);
    await expect(update.execute({ restaurantId: first.id, publicEnabled: true })).rejects.toMatchObject({ name: "InvalidRestaurantPublicConfigError" });
    await update.execute({ restaurantId: first.id, slug: "  Pizzá CASA ", publicEnabled: true });
    expect(first.slug).toBe("pizza-casa");
    expect(await repository.findPublishedBySlug("pizza-casa")).toBe(first);
    await expect(update.execute({ restaurantId: second.id, slug: "Pizza Casa" })).rejects.toMatchObject({ name: "RestaurantSlugConflictError" });
    await update.execute({ restaurantId: first.id, publicEnabled: false });
    await expect(new GetPublicRestaurantUseCase(repository).execute("pizza-casa")).rejects.toMatchObject({ name: "RestaurantNotFoundError" });
  });

  it("keeps hash out of in-memory return values and preserves token lookup after status changes", async () => {
    const repository = new InMemoryReservationsRepository();
    const token = createPublicReservationToken();
    const hash = hashPublicReservationToken(token);
    const reservation = await repository.create({ restaurantId: "r", tableId: "t", customerId: "c", people: 2, status: "SCHEDULED", startsAt: new Date(), endsAt: new Date(), publicAccessTokenHash: hash });
    expect(reservation).not.toHaveProperty("publicAccessTokenHash");
    expect(await repository.findByPublicAccessTokenHash(hash)).toEqual(reservation);
    expect(await repository.findByPublicAccessTokenHash(token)).toBeNull();
    await repository.updateStatus(reservation.id, "CANCELLED");
    expect(await repository.findByPublicAccessTokenHash(hash)).toMatchObject({ status: "CANCELLED" });
    expect(await repository.findById(reservation.id)).not.toHaveProperty("publicAccessTokenHash");
  });

  it("generates independent 256-bit tokens and deterministic SHA-256 hashes", () => {
    const tokens = Array.from({ length: 100 }, createPublicReservationToken);
    expect(new Set(tokens).size).toBe(100);
    for (const token of tokens) {
      expect(Buffer.from(token, "base64url")).toHaveLength(32);
      expect(hashPublicReservationToken(token)).toMatch(/^[a-f0-9]{64}$/);
      expect(hashPublicReservationToken(token)).toBe(hashPublicReservationToken(token));
    }
  });
});
