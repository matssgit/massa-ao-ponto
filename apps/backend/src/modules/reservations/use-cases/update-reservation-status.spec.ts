import { beforeEach, describe, expect, it, vi } from "vitest";

import { InMemoryCustomersRepository } from "../repositories/in-memory-customers-repository.js";
import { InMemoryReservationHistoryRepository } from "../repositories/in-memory-reservation-history-repository.js";
import { InMemoryReservationTransactionManager } from "../repositories/in-memory-reservation-transaction-manager.js";
import { InMemoryReservationsRepository } from "../repositories/in-memory-reservations-repository.js";
import { InMemoryTablesRepository } from "../../tables/repositories/in-memory-tables-repository.js";
import { InvalidReservationStatusTransitionError } from "../errors/invalid-reservation-status-transition-error.js";
import { Reservation } from "../repositories/reservations-repository.js";
import { ReservationNotFoundError } from "../errors/reservation-not-found-error.js";
import { UpdateReservationStatusUseCase } from "./update-reservation-status.use-case.js";
import { randomUUID } from "node:crypto";

describe("UpdateReservationStatusUseCase", () => {
  const restaurantId = "rest-1";
  let reservationsRepository: InMemoryReservationsRepository;
  let historyRepository: InMemoryReservationHistoryRepository;
  let transactionManager: InMemoryReservationTransactionManager;
  let useCase: UpdateReservationStatusUseCase;

  beforeEach(() => {
    reservationsRepository = new InMemoryReservationsRepository();
    historyRepository = new InMemoryReservationHistoryRepository();
    transactionManager = new InMemoryReservationTransactionManager(
      new InMemoryTablesRepository(),
      new InMemoryCustomersRepository(),
      reservationsRepository,
      historyRepository,
    );
    useCase = new UpdateReservationStatusUseCase(transactionManager);
  });

  function createMockReservation(status: Reservation["status"]): string {
    const id = randomUUID();
    reservationsRepository.items.push({
      id,
      restaurantId: "rest-1",
      tableId: "table-1",
      customerId: "cust-1",
      status,
      people: 2,
      startsAt: new Date(),
      endsAt: new Date(),
      observation: null,
    });
    return id;
  }

  it("deve realizar transicoes validas de SCHEDULED", async () => {
    let id = createMockReservation("SCHEDULED");
    const lookupSpy = vi.spyOn(
      reservationsRepository,
      "findByIdAndRestaurantIdForUpdate",
    );
    await expect(
      useCase.execute({ restaurantId, reservationId: id, newStatus: "CONFIRMED" }),
    ).resolves.toBeTruthy();
    expect(lookupSpy).toHaveBeenCalledWith(id, restaurantId);

    id = createMockReservation("SCHEDULED");
    await expect(
      useCase.execute({ restaurantId, reservationId: id, newStatus: "CANCELLED" }),
    ).resolves.toBeTruthy();
  });

  it("deve realizar transicoes validas de CONFIRMED", async () => {
    let id = createMockReservation("CONFIRMED");
    await expect(
      useCase.execute({ restaurantId, reservationId: id, newStatus: "FINISHED" }),
    ).resolves.toBeTruthy();

    id = createMockReservation("CONFIRMED");
    await expect(
      useCase.execute({ restaurantId, reservationId: id, newStatus: "NO_SHOW" }),
    ).resolves.toBeTruthy();

    id = createMockReservation("CONFIRMED");
    await expect(
      useCase.execute({ restaurantId, reservationId: id, newStatus: "CANCELLED" }),
    ).resolves.toBeTruthy();
  });

  it("deve impedir transicoes invalidas de SCHEDULED", async () => {
    const id = createMockReservation("SCHEDULED");
    await expect(
      useCase.execute({ restaurantId, reservationId: id, newStatus: "FINISHED" }),
    ).rejects.toBeInstanceOf(InvalidReservationStatusTransitionError);
    await expect(
      useCase.execute({ restaurantId, reservationId: id, newStatus: "NO_SHOW" }),
    ).rejects.toBeInstanceOf(InvalidReservationStatusTransitionError);
  });

  it("deve impedir transicao para o mesmo status", async () => {
    const id = createMockReservation("SCHEDULED");
    await expect(
      useCase.execute({ restaurantId, reservationId: id, newStatus: "SCHEDULED" }),
    ).rejects.toBeInstanceOf(InvalidReservationStatusTransitionError);
  });

  it("deve impedir transicao de estados finais", async () => {
    let id = createMockReservation("CANCELLED");
    await expect(
      useCase.execute({ restaurantId, reservationId: id, newStatus: "CONFIRMED" }),
    ).rejects.toBeInstanceOf(InvalidReservationStatusTransitionError);

    id = createMockReservation("FINISHED");
    await expect(
      useCase.execute({ restaurantId, reservationId: id, newStatus: "CONFIRMED" }),
    ).rejects.toBeInstanceOf(InvalidReservationStatusTransitionError);

    id = createMockReservation("NO_SHOW");
    await expect(
      useCase.execute({ restaurantId, reservationId: id, newStatus: "CONFIRMED" }),
    ).rejects.toBeInstanceOf(InvalidReservationStatusTransitionError);
  });

  it("deve falhar para reserva inexistente", async () => {
    await expect(
      useCase.execute({
        restaurantId,
        reservationId: "invalid-id",
        newStatus: "CONFIRMED",
      }),
    ).rejects.toBeInstanceOf(ReservationNotFoundError);
  });

  it("deve ocultar reserva cross-tenant sem criar histórico", async () => {
    const id = createMockReservation("SCHEDULED");
    const historySpy = vi.spyOn(historyRepository, "create");

    await expect(
      useCase.execute({
        restaurantId: "rest-2",
        reservationId: id,
        newStatus: "CONFIRMED",
      }),
    ).rejects.toBeInstanceOf(ReservationNotFoundError);

    expect(historySpy).not.toHaveBeenCalled();
    expect(reservationsRepository.items[0].status).toBe("SCHEDULED");
  });

  it("deve atualizar criar historico corretamente com observation", async () => {
    const id = createMockReservation("SCHEDULED");
    await useCase.execute({
      restaurantId,
      reservationId: id,
      newStatus: "CONFIRMED",
      observation: "Confirmado por telefone",
    });

    expect(historyRepository.items).toHaveLength(1);
    expect(historyRepository.items[0]).toMatchObject({
      reservationId: id,
      action: "STATUS_CHANGED",
      previousStatus: "SCHEDULED",
      newStatus: "CONFIRMED",
      observation: "Confirmado por telefone",
    });
  });
});
