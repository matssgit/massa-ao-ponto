import { beforeEach, describe, expect, it, vi } from "vitest";

import { GetReservationUseCase } from "./get-reservation.use-case.js";
import { InMemoryReservationsRepository } from "../repositories/in-memory-reservations-repository.js";
import { ReservationNotFoundError } from "../errors/reservation-not-found-error.js";
import { randomUUID } from "node:crypto";

describe("GetReservationUseCase", () => {
  let reservationsRepository: InMemoryReservationsRepository;
  let useCase: GetReservationUseCase;

  beforeEach(() => {
    reservationsRepository = new InMemoryReservationsRepository();
    useCase = new GetReservationUseCase(reservationsRepository);
  });

  it("deve retornar uma reserva existente pelo ID", async () => {
    const id = randomUUID();
    const restaurantId = randomUUID();
    reservationsRepository.items.push({
      id,
      restaurantId,
      tableId: "table-1",
      customerId: "cust-1",
      status: "SCHEDULED",
      people: 2,
      startsAt: new Date("2026-08-20T19:00:00Z"),
      endsAt: new Date("2026-08-20T21:00:00Z"),
      observation: null,
    });

    const lookupSpy = vi.spyOn(
      reservationsRepository,
      "findByIdAndRestaurantId",
    );
    const result = await useCase.execute({ restaurantId, reservationId: id });
    expect(result.id).toBe(id);
    expect(result.status).toBe("SCHEDULED");
    expect(lookupSpy).toHaveBeenCalledWith(id, restaurantId);
  });

  it("deve ocultar reserva pertencente a outro Restaurant", async () => {
    const id = randomUUID();
    reservationsRepository.items.push({
      id,
      restaurantId: randomUUID(),
      tableId: "table-1",
      customerId: "cust-1",
      status: "SCHEDULED",
      people: 2,
      startsAt: new Date("2026-08-20T19:00:00Z"),
      endsAt: new Date("2026-08-20T21:00:00Z"),
      observation: null,
    });

    await expect(
      useCase.execute({ restaurantId: randomUUID(), reservationId: id }),
    ).rejects.toBeInstanceOf(ReservationNotFoundError);
  });

  it("deve lançar ReservationNotFoundError quando o ID não existir", async () => {
    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        reservationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ReservationNotFoundError);
  });
});
