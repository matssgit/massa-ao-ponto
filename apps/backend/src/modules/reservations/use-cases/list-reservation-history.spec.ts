import { beforeEach, describe, expect, it, vi } from "vitest";

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

  function createMockReservation(id: string, restaurantId: string) {
    reservationsRepository.items.push({
      id,
      restaurantId,
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
    const restaurantId = randomUUID();
    createMockReservation(id, restaurantId);

    historyRepository.items.push({
      id: randomUUID(),
      reservationId: id,
      action: "CREATED",
      previousStatus: null,
      newStatus: "SCHEDULED",
      observation: null,
      createdAt: new Date(),
    });

    const result = await useCase.execute({ restaurantId, reservationId: id });
    expect(result).toHaveLength(1);
    expect(result[0].reservationId).toBe(id);
  });

  it("deve retornar os registros em ordem cronológica crescente", async () => {
    const id = randomUUID();
    const restaurantId = randomUUID();
    createMockReservation(id, restaurantId);

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

    const result = await useCase.execute({ restaurantId, reservationId: id });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("event-1");
    expect(result[1].id).toBe("event-2");
  });

  it("deve retornar [] para reserva existente sem histórico", async () => {
    const id = randomUUID();
    const restaurantId = randomUUID();
    createMockReservation(id, restaurantId);

    const result = await useCase.execute({ restaurantId, reservationId: id });
    expect(result).toEqual([]);
  });

  it("deve ocultar reserva cross-tenant sem consultar o histórico", async () => {
    const id = randomUUID();
    createMockReservation(id, randomUUID());
    const historySpy = vi.spyOn(historyRepository, "findByReservationId");

    await expect(
      useCase.execute({ restaurantId: randomUUID(), reservationId: id }),
    ).rejects.toBeInstanceOf(ReservationNotFoundError);
    expect(historySpy).not.toHaveBeenCalled();
  });

  it("deve rejeitar reserva inexistente sem consultar o histórico", async () => {
    const historySpy = vi.spyOn(historyRepository, "findByReservationId");

    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        reservationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ReservationNotFoundError);
    expect(historySpy).not.toHaveBeenCalled();
  });

  it("deve isolar o histórico por reservationId", async () => {
    const id1 = randomUUID();
    const id2 = randomUUID();
    const restaurantId = randomUUID();
    createMockReservation(id1, restaurantId);
    createMockReservation(id2, restaurantId);

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

    const result = await useCase.execute({ restaurantId, reservationId: id1 });
    expect(result).toHaveLength(1);
    expect(result[0].reservationId).toBe(id1);
  });
});
