import { beforeEach, describe, expect, it } from "vitest";

import { CancelReservationUseCase } from "./cancel-reservation.use-case.js";
import { InMemoryCustomersRepository } from "../repositories/in-memory-customers-repository.js";
import { InMemoryReservationHistoryRepository } from "../repositories/in-memory-reservation-history-repository.js";
import { InMemoryReservationTransactionManager } from "../repositories/in-memory-reservation-transaction-manager.js";
import { InMemoryReservationsRepository } from "../repositories/in-memory-reservations-repository.js";
import { InMemoryTablesRepository } from "../../tables/repositories/in-memory-tables-repository.js";
import { InvalidReservationStatusTransitionError } from "../errors/invalid-reservation-status-transition-error.js";
import { Reservation } from "../repositories/reservations-repository.js";
import { ReservationCancellationWindowExpiredError } from "../errors/reservation-cancellation-window-expired-error.js";
import { ReservationNotFoundError } from "../errors/reservation-not-found-error.js";
import { randomUUID } from "node:crypto";

describe("CancelReservationUseCase", () => {
  let reservationsRepository: InMemoryReservationsRepository;
  let historyRepository: InMemoryReservationHistoryRepository;
  let transactionManager: InMemoryReservationTransactionManager;
  let useCase: CancelReservationUseCase;

  beforeEach(() => {
    reservationsRepository = new InMemoryReservationsRepository();
    historyRepository = new InMemoryReservationHistoryRepository();
    transactionManager = new InMemoryReservationTransactionManager(
      new InMemoryTablesRepository(),
      new InMemoryCustomersRepository(),
      reservationsRepository,
      historyRepository,
    );
    useCase = new CancelReservationUseCase(transactionManager);
  });

  function createMockReservation(
    status: Reservation["status"],
    startsAt: Date,
  ): string {
    const id = randomUUID();
    reservationsRepository.items.push({
      id,
      restaurantId: "rest-1",
      tableId: "table-1",
      customerId: "cust-1",
      status,
      people: 2,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000),
      observation: null,
    });
    return id;
  }

  it("permite cancelamento quando faltam mais de 2 horas (SCHEDULED)", async () => {
    const startsAt = new Date("2026-08-20T20:00:00Z");
    const now = new Date("2026-08-20T17:00:00Z");
    const id = createMockReservation("SCHEDULED", startsAt);

    const result = await useCase.execute({ reservationId: id, now });
    expect(result.status).toBe("CANCELLED");
  });

  it("permite cancelamento quando faltam mais de 2 horas (CONFIRMED)", async () => {
    const startsAt = new Date("2026-08-20T20:00:00Z");
    const now = new Date("2026-08-20T17:59:59Z");
    const id = createMockReservation("CONFIRMED", startsAt);

    const result = await useCase.execute({ reservationId: id, now });
    expect(result.status).toBe("CANCELLED");
  });

  it("rejeita cancelamento de reserva inexistente", async () => {
    await expect(
      useCase.execute({ reservationId: "invalid-id", now: new Date() }),
    ).rejects.toBeInstanceOf(ReservationNotFoundError);
  });

  it("rejeita cancelamento de reserva já CANCELLED", async () => {
    const startsAt = new Date("2026-08-20T20:00:00Z");
    const id = createMockReservation("CANCELLED", startsAt);
    await expect(
      useCase.execute({
        reservationId: id,
        now: new Date("2026-08-20T15:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(InvalidReservationStatusTransitionError);
  });

  it("rejeita cancelamento de reserva FINISHED", async () => {
    const startsAt = new Date("2026-08-20T20:00:00Z");
    const id = createMockReservation("FINISHED", startsAt);
    await expect(
      useCase.execute({
        reservationId: id,
        now: new Date("2026-08-20T15:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(InvalidReservationStatusTransitionError);
  });

  it("rejeita cancelamento de reserva NO_SHOW", async () => {
    const startsAt = new Date("2026-08-20T20:00:00Z");
    const id = createMockReservation("NO_SHOW", startsAt);
    await expect(
      useCase.execute({
        reservationId: id,
        now: new Date("2026-08-20T15:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(InvalidReservationStatusTransitionError);
  });

  it("rejeita cancelamento quando faltam exatamente 2 horas", async () => {
    const startsAt = new Date("2026-08-20T20:00:00Z");
    const now = new Date("2026-08-20T18:00:00Z");
    const id = createMockReservation("SCHEDULED", startsAt);

    await expect(
      useCase.execute({ reservationId: id, now }),
    ).rejects.toBeInstanceOf(ReservationCancellationWindowExpiredError);
  });

  it("rejeita cancelamento quando faltam menos de 2 horas", async () => {
    const startsAt = new Date("2026-08-20T20:00:00Z");
    const now = new Date("2026-08-20T19:00:00Z");
    const id = createMockReservation("SCHEDULED", startsAt);

    await expect(
      useCase.execute({ reservationId: id, now }),
    ).rejects.toBeInstanceOf(ReservationCancellationWindowExpiredError);
  });

  it("verifica que o histórico foi criado e mantém consistência transacional", async () => {
    const startsAt = new Date("2026-08-20T20:00:00Z");
    const now = new Date("2026-08-20T15:00:00Z");
    const id = createMockReservation("SCHEDULED", startsAt);

    await useCase.execute({ reservationId: id, now });

    expect(historyRepository.items).toHaveLength(1);
    expect(historyRepository.items[0]).toMatchObject({
      reservationId: id,
      action: "STATUS_CHANGED",
      previousStatus: "SCHEDULED",
      newStatus: "CANCELLED",
    });
  });
});
