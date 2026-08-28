import { beforeEach, describe, expect, it, vi } from "vitest";

import { InMemoryCustomersRepository } from "../repositories/in-memory-customers-repository.js";
import { InMemoryReservationsRepository } from "../repositories/in-memory-reservations-repository.js";
import { InMemoryTablesRepository } from "../../tables/repositories/in-memory-tables-repository.js";
import { InvalidTimeRangeFilterError } from "../errors/invalid-time-range-filter-error.js";
import { ListReservationsUseCase } from "./list-reservations.use-case.js";
import { Reservation } from "../repositories/reservations-repository.js";

describe("ListReservationsUseCase", () => {
  let reservationsRepository: InMemoryReservationsRepository;
  let customersRepository: InMemoryCustomersRepository;
  let tablesRepository: InMemoryTablesRepository;
  let useCase: ListReservationsUseCase;

  function makeReservation(
    overrides: Partial<Reservation> & Pick<Reservation, "id">,
  ): Reservation {
    return {
      restaurantId: "rest-1",
      tableId: "tab-1",
      customerId: "cust-1",
      status: "SCHEDULED",
      people: 2,
      startsAt: new Date("2026-06-12T19:00:00Z"),
      endsAt: new Date("2026-06-12T21:00:00Z"),
      observation: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    reservationsRepository = new InMemoryReservationsRepository();
    customersRepository = new InMemoryCustomersRepository(
      reservationsRepository.items,
    );
    tablesRepository = new InMemoryTablesRepository();

    customersRepository.items.push(
      {
        id: "cust-1",
        name: "Ana",
        phone: "11911111111",
        email: null,
      },
      {
        id: "cust-2",
        name: "Bruno",
        phone: "11922222222",
        email: "bruno@example.com",
      },
      {
        id: "cust-other",
        name: "Outro tenant",
        phone: "11933333333",
        email: null,
      },
    );
    tablesRepository.items.push(
      {
        id: "tab-1",
        restaurantId: "rest-1",
        number: "1",
        capacity: 4,
        type: "table",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "tab-2",
        restaurantId: "rest-1",
        number: "2",
        capacity: 6,
        type: "table",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "tab-other",
        restaurantId: "rest-2",
        number: "1",
        capacity: 4,
        type: "table",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    useCase = new ListReservationsUseCase(
      reservationsRepository,
      customersRepository,
      tablesRepository,
    );
  });

  it("deve retornar envelope vazio com metadata consistente", async () => {
    const result = await useCase.execute({
      restaurantId: "rest-1",
      page: 1,
      limit: 20,
    });

    expect(result).toEqual({
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    });
  });

  it("deve paginar, ordenar, isolar tenant e hidratar Customer e Table em lote", async () => {
    reservationsRepository.items.push(
      makeReservation({
        id: "res-b",
        tableId: "tab-2",
        customerId: "cust-2",
      }),
      makeReservation({ id: "res-a" }),
      makeReservation({
        id: "res-0",
        tableId: "tab-2",
        customerId: "cust-2",
        startsAt: new Date("2026-06-12T18:00:00Z"),
        endsAt: new Date("2026-06-12T19:00:00Z"),
      }),
      makeReservation({
        id: "res-other",
        restaurantId: "rest-2",
        tableId: "tab-other",
        customerId: "cust-other",
      }),
    );
    const customersSpy = vi.spyOn(customersRepository, "findManyByIds");
    const tablesSpy = vi.spyOn(
      tablesRepository,
      "findManyByIdsAndRestaurantId",
    );

    const firstPage = await useCase.execute({
      restaurantId: "rest-1",
      page: 1,
      limit: 2,
    });
    const finalPage = await useCase.execute({
      restaurantId: "rest-1",
      page: 2,
      limit: 2,
    });

    expect(firstPage.data.map(({ reservation }) => reservation.id)).toEqual([
      "res-0",
      "res-a",
    ]);
    expect(firstPage.data[0]).toEqual({
      reservation: expect.objectContaining({ id: "res-0" }),
      customer: expect.objectContaining({ id: "cust-2", name: "Bruno" }),
      table: expect.objectContaining({ id: "tab-2", number: "2" }),
    });
    expect(firstPage.meta).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
      hasNext: true,
      hasPrevious: false,
    });
    expect(finalPage.data.map(({ reservation }) => reservation.id)).toEqual([
      "res-b",
    ]);
    expect(finalPage.meta).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
      hasNext: false,
      hasPrevious: true,
    });
    expect(customersSpy).toHaveBeenCalledTimes(2);
    expect(tablesSpy).toHaveBeenCalledTimes(2);
  });

  it("deve filtrar por status e refletir o filtro no total", async () => {
    reservationsRepository.items.push(
      makeReservation({ id: "res-scheduled" }),
      makeReservation({ id: "res-confirmed", status: "CONFIRMED" }),
    );

    const result = await useCase.execute({
      restaurantId: "rest-1",
      status: "CONFIRMED",
      page: 1,
      limit: 20,
    });

    expect(result.data.map(({ reservation }) => reservation.id)).toEqual([
      "res-confirmed",
    ]);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });

  it("deve incluir overlap parcial no início do intervalo solicitado", async () => {
    reservationsRepository.items.push(
      makeReservation({
        id: "res-partial-start",
        startsAt: new Date("2026-06-12T18:00:00Z"),
        endsAt: new Date("2026-06-12T20:00:00Z"),
      }),
    );

    const result = await useCase.execute({
      restaurantId: "rest-1",
      startsAt: new Date("2026-06-12T19:00:00Z"),
      endsAt: new Date("2026-06-12T21:00:00Z"),
      page: 1,
      limit: 20,
    });

    expect(result.data[0].reservation.id).toBe("res-partial-start");
    expect(result.meta.total).toBe(1);
  });

  it("deve incluir overlap parcial no fim do intervalo solicitado", async () => {
    reservationsRepository.items.push(
      makeReservation({
        id: "res-partial-end",
        startsAt: new Date("2026-06-12T20:00:00Z"),
        endsAt: new Date("2026-06-12T22:00:00Z"),
      }),
    );

    const result = await useCase.execute({
      restaurantId: "rest-1",
      startsAt: new Date("2026-06-12T19:00:00Z"),
      endsAt: new Date("2026-06-12T21:00:00Z"),
      page: 1,
      limit: 20,
    });

    expect(result.data[0].reservation.id).toBe("res-partial-end");
    expect(result.meta.total).toBe(1);
  });

  it("deve excluir reservas fora do intervalo e contatos exatos nas bordas", async () => {
    reservationsRepository.items.push(
      makeReservation({
        id: "res-before",
        startsAt: new Date("2026-06-12T17:00:00Z"),
        endsAt: new Date("2026-06-12T19:00:00Z"),
      }),
      makeReservation({
        id: "res-after",
        startsAt: new Date("2026-06-12T21:00:00Z"),
        endsAt: new Date("2026-06-12T23:00:00Z"),
      }),
    );

    const result = await useCase.execute({
      restaurantId: "rest-1",
      startsAt: new Date("2026-06-12T19:00:00Z"),
      endsAt: new Date("2026-06-12T21:00:00Z"),
      page: 1,
      limit: 20,
    });

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });

  it("deve rejeitar intervalo de datas invertido", async () => {
    await expect(
      useCase.execute({
        restaurantId: "rest-1",
        startsAt: new Date("2026-06-12T22:00:00Z"),
        endsAt: new Date("2026-06-12T20:00:00Z"),
        page: 1,
        limit: 20,
      }),
    ).rejects.toBeInstanceOf(InvalidTimeRangeFilterError);
  });
});
