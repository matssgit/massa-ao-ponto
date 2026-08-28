import { beforeEach, describe, expect, it } from "vitest";

import { CapacityExceededError } from "../errors/capacity-exceeded-error.js";
import { CreateReservationUseCase } from "./create-reservation.use-case.js";
import { InMemoryCustomersRepository } from "../repositories/in-memory-customers-repository.js";
import { InMemoryReservationHistoryRepository } from "../repositories/in-memory-reservation-history-repository.js";
import { InMemoryReservationTransactionManager } from "../repositories/in-memory-reservation-transaction-manager.js";
import { InMemoryReservationsRepository } from "../repositories/in-memory-reservations-repository.js";
import { InMemoryTablesRepository } from "../../tables/repositories/in-memory-tables-repository.js";
import { InvalidTimeRangeError } from "../errors/invalid-time-range-error.js";
import { ReservationConflictError } from "../errors/reservation-conflict-error.js";
import { TableInactiveError } from "../errors/table-inactive-error.js";
import { TableNotFoundError } from "../errors/table-not-found-error.js";
import { TableRestaurantMismatchError } from "../errors/table-restaurant-mismatch-error.js";
import { randomUUID } from "node:crypto";

describe("CreateReservationUseCase", () => {
  let tablesRepository: InMemoryTablesRepository;
  let customersRepository: InMemoryCustomersRepository;
  let reservationsRepository: InMemoryReservationsRepository;
  let historyRepository: InMemoryReservationHistoryRepository;
  let transactionManager: InMemoryReservationTransactionManager;
  let useCase: CreateReservationUseCase;

  beforeEach(() => {
    tablesRepository = new InMemoryTablesRepository();
    customersRepository = new InMemoryCustomersRepository();
    reservationsRepository = new InMemoryReservationsRepository();
    historyRepository = new InMemoryReservationHistoryRepository();

    transactionManager = new InMemoryReservationTransactionManager(
      tablesRepository,
      customersRepository,
      reservationsRepository,
      historyRepository,
    );

    useCase = new CreateReservationUseCase(transactionManager);

    tablesRepository.items.push({
      id: "table-1",
      restaurantId: "rest-1",
      number: "12",
      capacity: 4,
      type: "table",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("deve criar uma reserva com sucesso e gerar historico", async () => {
    const reservation = await useCase.execute({
      restaurantId: "rest-1",
      tableId: "table-1",
      customer: { name: "João", phone: "11999999999" },
      people: 2,
      startsAt: new Date("2026-06-12T19:00:00Z"),
      endsAt: new Date("2026-06-12T21:00:00Z"),
    });

    expect(reservation.id).toEqual(expect.any(String));
    expect(historyRepository.items).toHaveLength(1);
    expect(historyRepository.items[0]).toMatchObject({
      reservationId: reservation.id,
      newStatus: "SCHEDULED",
      previousStatus: null,
      action: "CREATED",
    });
  });

  it("deve reutilizar customer existente pelo telefone", async () => {
    const existingCustomer = await customersRepository.create({
      name: "Maria",
      phone: "11999999999",
    });

    const reservation = await useCase.execute({
      restaurantId: "rest-1",
      tableId: "table-1",
      customer: {
        name: "Maria Silva",
        phone: "(11) 99999-9999",
        email: "novo@example.com",
      },
      people: 2,
      startsAt: new Date("2026-06-12T19:00:00Z"),
      endsAt: new Date("2026-06-12T21:00:00Z"),
    });

    expect(reservation.customerId).toEqual(existingCustomer.id);
    expect(customersRepository.items).toHaveLength(1);
    expect(customersRepository.items[0]).toMatchObject({
      name: "Maria",
      email: null,
    });
  });

  it("deve criar um novo customer quando telefone ainda nao existe", async () => {
    const reservation = await useCase.execute({
      restaurantId: "rest-1",
      tableId: "table-1",
      customer: { name: "Novo Cliente", phone: "11988888888" },
      people: 2,
      startsAt: new Date("2026-06-12T19:00:00Z"),
      endsAt: new Date("2026-06-12T21:00:00Z"),
    });

    expect(reservation.customerId).toEqual(expect.any(String));
    expect(customersRepository.items).toHaveLength(1);
    expect(customersRepository.items[0].phone).toBe("11988888888");
  });

  it("deve impedir reserva em mesa inexistente", async () => {
    await expect(
      useCase.execute({
        restaurantId: "rest-1",
        tableId: "invalid-table",
        customer: { name: "João", phone: "11999999999" },
        people: 2,
        startsAt: new Date("2026-06-12T19:00:00Z"),
        endsAt: new Date("2026-06-12T21:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(TableNotFoundError);
  });

  it("deve impedir reserva em mesa inativa", async () => {
    tablesRepository.items[0].active = false;

    await expect(
      useCase.execute({
        restaurantId: "rest-1",
        tableId: "table-1",
        customer: { name: "João", phone: "11999999999" },
        people: 2,
        startsAt: new Date("2026-06-12T19:00:00Z"),
        endsAt: new Date("2026-06-12T21:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(TableInactiveError);
  });

  it("deve impedir mesa pertencente a outro restaurante", async () => {
    await expect(
      useCase.execute({
        restaurantId: "other-rest",
        tableId: "table-1",
        customer: { name: "João", phone: "11999999999" },
        people: 2,
        startsAt: new Date("2026-06-12T19:00:00Z"),
        endsAt: new Date("2026-06-12T21:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(TableRestaurantMismatchError);
  });

  it("deve impedir quantidade de pessoas maior que capacidade", async () => {
    await expect(
      useCase.execute({
        restaurantId: "rest-1",
        tableId: "table-1",
        customer: { name: "João", phone: "11999999999" },
        people: 5,
        startsAt: new Date("2026-06-12T19:00:00Z"),
        endsAt: new Date("2026-06-12T21:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(CapacityExceededError);
  });

  it("deve impedir startsAt >= endsAt", async () => {
    await expect(
      useCase.execute({
        restaurantId: "rest-1",
        tableId: "table-1",
        customer: { name: "João", phone: "11999999999" },
        people: 2,
        startsAt: new Date("2026-06-12T21:00:00Z"),
        endsAt: new Date("2026-06-12T19:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(InvalidTimeRangeError);

    await expect(
      useCase.execute({
        restaurantId: "rest-1",
        tableId: "table-1",
        customer: { name: "João", phone: "11999999999" },
        people: 2,
        startsAt: new Date("2026-06-12T19:00:00Z"),
        endsAt: new Date("2026-06-12T19:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(InvalidTimeRangeError);
  });

  it("deve impedir conflito completo", async () => {
    await reservationsRepository.create({
      restaurantId: "rest-1",
      tableId: "table-1",
      customerId: "cust-1",
      status: "SCHEDULED",
      people: 2,
      startsAt: new Date("2026-06-12T19:00:00Z"),
      endsAt: new Date("2026-06-12T21:00:00Z"),
    });

    await expect(
      useCase.execute({
        restaurantId: "rest-1",
        tableId: "table-1",
        customer: { name: "João", phone: "11999999999" },
        people: 2,
        startsAt: new Date("2026-06-12T19:00:00Z"),
        endsAt: new Date("2026-06-12T21:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(ReservationConflictError);
  });

  it("deve impedir conflito parcial no inicio e no fim", async () => {
    await reservationsRepository.create({
      restaurantId: "rest-1",
      tableId: "table-1",
      customerId: "cust-1",
      status: "SCHEDULED",
      people: 2,
      startsAt: new Date("2026-06-12T19:00:00Z"),
      endsAt: new Date("2026-06-12T21:00:00Z"),
    });

    await expect(
      useCase.execute({
        restaurantId: "rest-1",
        tableId: "table-1",
        customer: { name: "João", phone: "11999999999" },
        people: 2,
        startsAt: new Date("2026-06-12T18:00:00Z"),
        endsAt: new Date("2026-06-12T20:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(ReservationConflictError);

    await expect(
      useCase.execute({
        restaurantId: "rest-1",
        tableId: "table-1",
        customer: { name: "João", phone: "11999999999" },
        people: 2,
        startsAt: new Date("2026-06-12T20:00:00Z"),
        endsAt: new Date("2026-06-12T22:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(ReservationConflictError);
  });

  it("deve permitir reserva imediatamente apos e antes de outra", async () => {
    await reservationsRepository.create({
      restaurantId: "rest-1",
      tableId: "table-1",
      customerId: "cust-1",
      status: "SCHEDULED",
      people: 2,
      startsAt: new Date("2026-06-12T19:00:00Z"),
      endsAt: new Date("2026-06-12T21:00:00Z"),
    });

    await expect(
      useCase.execute({
        restaurantId: "rest-1",
        tableId: "table-1",
        customer: { name: "João", phone: "11999999999" },
        people: 2,
        startsAt: new Date("2026-06-12T21:00:00Z"),
        endsAt: new Date("2026-06-12T23:00:00Z"),
      }),
    ).resolves.toBeTruthy();

    await expect(
      useCase.execute({
        restaurantId: "rest-1",
        tableId: "table-1",
        customer: { name: "João", phone: "11999999999" },
        people: 2,
        startsAt: new Date("2026-06-12T17:00:00Z"),
        endsAt: new Date("2026-06-12T19:00:00Z"),
      }),
    ).resolves.toBeTruthy();
  });

  it("deve ignorar reservas canceladas, finalizadas e no-show", async () => {
    const statuses: Array<"CANCELLED" | "FINISHED" | "NO_SHOW"> = [
      "CANCELLED",
      "FINISHED",
      "NO_SHOW",
    ];

    for (const status of statuses) {
      reservationsRepository.items.push({
        id: randomUUID(),
        restaurantId: "rest-1",
        tableId: "table-1",
        customerId: "cust-1",
        status: status,
        people: 2,
        startsAt: new Date("2026-06-12T19:00:00Z"),
        endsAt: new Date("2026-06-12T21:00:00Z"),
        observation: null,
      });

      await expect(
        useCase.execute({
          restaurantId: "rest-1",
          tableId: "table-1",
          customer: { name: "João", phone: "11999999999" },
          people: 2,
          startsAt: new Date("2026-06-12T19:00:00Z"),
          endsAt: new Date("2026-06-12T21:00:00Z"),
        }),
      ).resolves.toBeTruthy();

      reservationsRepository.items = [];
    }
  });
});
