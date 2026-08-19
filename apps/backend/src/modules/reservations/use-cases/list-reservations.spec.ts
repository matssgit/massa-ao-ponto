import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryReservationsRepository } from "../repositories/in-memory-reservations-repository.js";
import { InvalidTimeRangeFilterError } from "../errors/invalid-time-range-filter-error.js";
import { ListReservationsUseCase } from "./list-reservations.use-case.js";
import { randomUUID } from "node:crypto";

describe("ListReservationsUseCase", () => {
  let reservationsRepository: InMemoryReservationsRepository;
  let useCase: ListReservationsUseCase;

  beforeEach(() => {
    reservationsRepository = new InMemoryReservationsRepository();
    useCase = new ListReservationsUseCase(reservationsRepository);
  });

  it("deve retornar lista vazia quando o restaurante não possui reservas", async () => {
    const result = await useCase.execute({ restaurantId: "rest-1" });
    expect(result).toEqual([]);
  });

  it("deve listar todas as reservas do restaurante correto e ignorar de outros", async () => {
    reservationsRepository.items.push(
      {
        id: "res-1",
        restaurantId: "rest-1",
        tableId: "tab-1",
        customerId: "cust-1",
        status: "SCHEDULED",
        people: 2,
        startsAt: new Date("2026-06-12T19:00:00Z"),
        endsAt: new Date("2026-06-12T21:00:00Z"),
        observation: null,
      },
      {
        id: "res-2",
        restaurantId: "rest-2",
        tableId: "tab-2",
        customerId: "cust-2",
        status: "SCHEDULED",
        people: 2,
        startsAt: new Date("2026-06-12T19:00:00Z"),
        endsAt: new Date("2026-06-12T21:00:00Z"),
        observation: null,
      },
    );

    const result = await useCase.execute({ restaurantId: "rest-1" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("res-1");
  });

  it("deve filtrar por status", async () => {
    reservationsRepository.items.push(
      {
        id: "res-1",
        restaurantId: "rest-1",
        tableId: "tab-1",
        customerId: "cust-1",
        status: "SCHEDULED",
        people: 2,
        startsAt: new Date("2026-06-12T19:00:00Z"),
        endsAt: new Date("2026-06-12T21:00:00Z"),
        observation: null,
      },
      {
        id: "res-2",
        restaurantId: "rest-1",
        tableId: "tab-1",
        customerId: "cust-1",
        status: "CONFIRMED",
        people: 2,
        startsAt: new Date("2026-06-12T19:00:00Z"),
        endsAt: new Date("2026-06-12T21:00:00Z"),
        observation: null,
      },
    );

    const result = await useCase.execute({
      restaurantId: "rest-1",
      status: "CONFIRMED",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("res-2");
  });

  it("deve filtrar por startsAt e endsAt", async () => {
    reservationsRepository.items.push(
      {
        id: "res-1",
        restaurantId: "rest-1",
        tableId: "tab-1",
        customerId: "cust-1",
        status: "SCHEDULED",
        people: 2,
        startsAt: new Date("2026-06-12T18:00:00Z"),
        endsAt: new Date("2026-06-12T20:00:00Z"),
        observation: null,
      },
      {
        id: "res-2",
        restaurantId: "rest-1",
        tableId: "tab-1",
        customerId: "cust-1",
        status: "SCHEDULED",
        people: 2,
        startsAt: new Date("2026-06-12T19:30:00Z"),
        endsAt: new Date("2026-06-12T20:30:00Z"),
        observation: null,
      },
    );

    const result = await useCase.execute({
      restaurantId: "rest-1",
      startsAt: new Date("2026-06-12T19:00:00Z"),
      endsAt: new Date("2026-06-12T21:00:00Z"),
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("res-2");
  });

  it("deve ordenar cronologicamente por startsAt e depois por id", async () => {
    reservationsRepository.items.push(
      {
        id: "res-b",
        restaurantId: "rest-1",
        tableId: "tab-1",
        customerId: "cust-1",
        status: "SCHEDULED",
        people: 2,
        startsAt: new Date("2026-06-12T19:00:00Z"),
        endsAt: new Date("2026-06-12T21:00:00Z"),
        observation: null,
      },
      {
        id: "res-a",
        restaurantId: "rest-1",
        tableId: "tab-1",
        customerId: "cust-1",
        status: "SCHEDULED",
        people: 2,
        startsAt: new Date("2026-06-12T19:00:00Z"),
        endsAt: new Date("2026-06-12T21:00:00Z"),
        observation: null,
      },
      {
        id: "res-c",
        restaurantId: "rest-1",
        tableId: "tab-1",
        customerId: "cust-1",
        status: "SCHEDULED",
        people: 2,
        startsAt: new Date("2026-06-12T18:00:00Z"),
        endsAt: new Date("2026-06-12T20:00:00Z"),
        observation: null,
      },
    );

    const result = await useCase.execute({ restaurantId: "rest-1" });
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("res-c");
    expect(result[1].id).toBe("res-a");
    expect(result[2].id).toBe("res-b");
  });

  it("deve rejeitar intervalo de datas invertido", async () => {
    await expect(
      useCase.execute({
        restaurantId: "rest-1",
        startsAt: new Date("2026-06-12T22:00:00Z"),
        endsAt: new Date("2026-06-12T20:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(InvalidTimeRangeFilterError);
  });
});
