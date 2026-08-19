import { beforeEach, describe, expect, it } from "vitest";

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
    reservationsRepository.items.push({
      id,
      restaurantId: "rest-1",
      tableId: "table-1",
      customerId: "cust-1",
      status: "SCHEDULED",
      people: 2,
      startsAt: new Date("2026-08-20T19:00:00Z"),
      endsAt: new Date("2026-08-20T21:00:00Z"),
      observation: null,
    });

    const result = await useCase.execute({ reservationId: id });
    expect(result.id).toBe(id);
    expect(result.status).toBe("SCHEDULED");
  });

  it("deve lançar ReservationNotFoundError quando o ID não existir", async () => {
    await expect(
      useCase.execute({ reservationId: "invalid-id" }),
    ).rejects.toBeInstanceOf(ReservationNotFoundError);
  });
});
