import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryReservationHistoryRepository } from "../repositories/in-memory-reservation-history-repository.js";
import { InMemoryReservationsRepository } from "../repositories/in-memory-reservations-repository.js";
import { ListReservationHistoryUseCase } from "./list-reservation-history.use-case.js";
import { ReservationNotFoundError } from "../errors/reservation-not-found-error.js";
import { randomUUID } from "node:crypto";

describe("ListReservationHistoryUseCase", () => {
  let reservationsRepository: InMemoryReservationsRepository;
  let historyRepository: InMemoryReservationHistoryRepository;
  let useCase: ListReservationHistoryUseCase;

  beforeEach(() => {
    reservationsRepository = new InMemoryReservationsRepository();
    historyRepository = new InMemoryReservationHistoryRepository();
    useCase = new ListReservationHistoryUseCase(
      reservationsRepository,
      historyRepository,
    );
  });

  function createMockReservation(id: string) {
    reservationsRepository.items.push({
      id,
      restaurantId: "rest-1",
      tableId: "table-1",
      customerId: "cust-1",
      status: "SCHEDULED",
      people: 2,
      startsAt: new Date(),
      endsAt: new Date(),
      observation: null,
    });
  }

  it("deve retornar os registros pertencentes à reserva", async () => {
    const id = randomUUID();
    createMockReservation(id);

    historyRepository.items.push({
      id: randomUUID(),
      reservationId: id,
      action: "CREATED",
      previousStatus: null,
      newStatus: "SCHEDULED",
      observation: null,
      createdAt: new Date(),
    });

    const result = await useCase.execute({ reservationId: id });
    expect(result).toHaveLength(1);
    expect(result[0].reservationId).toBe(id);
  });

  it("deve retornar os registros em ordem cronológica crescente", async () => {
    const id = randomUUID();
    createMockReservation(id);

    const now = Date.now();

    historyRepository.items.push(
      {
        id: "event-2",
        reservationId: id,
        action: "STATUS_CHANGED",
        previousStatus: "SCHEDULED",
        newStatus: "CONFIRMED",
        observation: null,
        createdAt: new Date(now + 1000),
      },
      {
        id: "event-1",
        reservationId: id,
        action: "CREATED",
        previousStatus: null,
        newStatus: "SCHEDULED",
        observation: null,
        createdAt: new Date(now),
      },
    );

    const result = await useCase.execute({ reservationId: id });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("event-1");
    expect(result[1].id).toBe("event-2");
  });

  it("deve retornar [] para reserva existente sem histórico", async () => {
    const id = randomUUID();
    createMockReservation(id);

    const result = await useCase.execute({ reservationId: id });
    expect(result).toEqual([]);
  });

  it("deve lançar ReservationNotFoundError para reserva inexistente", async () => {
    await expect(
      useCase.execute({ reservationId: "invalid-id" }),
    ).rejects.toBeInstanceOf(ReservationNotFoundError);
  });

  it("deve isolar o histórico por reservationId", async () => {
    const id1 = randomUUID();
    const id2 = randomUUID();
    createMockReservation(id1);
    createMockReservation(id2);

    historyRepository.items.push({
      id: randomUUID(),
      reservationId: id1,
      action: "CREATED",
      previousStatus: null,
      newStatus: "SCHEDULED",
      observation: null,
      createdAt: new Date(),
    });

    historyRepository.items.push({
      id: randomUUID(),
      reservationId: id2,
      action: "CREATED",
      previousStatus: null,
      newStatus: "SCHEDULED",
      observation: null,
      createdAt: new Date(),
    });

    const result = await useCase.execute({ reservationId: id1 });
    expect(result).toHaveLength(1);
    expect(result[0].reservationId).toBe(id1);
  });
});
