import { beforeEach, describe, expect, it } from "vitest";

import { GetAvailabilityUseCase } from "./get-availability.use-case.js";
import { InMemoryReservationsRepository } from "../repositories/in-memory-reservations-repository.js";
import { InMemoryRestaurantsRepository } from "../../restaurants/repositories/in-memory-restaurants-repository.js";
import { InMemoryTablesRepository } from "../../tables/repositories/in-memory-tables-repository.js";
import { InvalidTimeRangeError } from "../errors/invalid-time-range-error.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { randomUUID } from "node:crypto";

describe("GetAvailabilityUseCase", () => {
  let restaurantsRepository: InMemoryRestaurantsRepository;
  let tablesRepository: InMemoryTablesRepository;
  let reservationsRepository: InMemoryReservationsRepository;
  let useCase: GetAvailabilityUseCase;

  beforeEach(() => {
    restaurantsRepository = new InMemoryRestaurantsRepository();
    tablesRepository = new InMemoryTablesRepository();
    reservationsRepository = new InMemoryReservationsRepository();
    useCase = new GetAvailabilityUseCase(
      restaurantsRepository,
      tablesRepository,
      reservationsRepository,
    );

    restaurantsRepository.items.push({
      id: "rest-1",
      name: "Restaurante",
      address: "Endereço",
      phone: "11999999999",
      timezone: "UTC",
      slug: null,
      publicEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    tablesRepository.items.push(
      {
        id: "tab-1",
        restaurantId: "rest-1",
        number: "1",
        capacity: 2,
        type: "table",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "tab-2",
        restaurantId: "rest-1",
        number: "2",
        capacity: 4,
        type: "table",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "tab-inactive",
        restaurantId: "rest-1",
        number: "3",
        capacity: 4,
        type: "table",
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );
  });

  it("deve retornar todas as mesas ativas disponíveis", async () => {
    const result = await useCase.execute({
      restaurantId: "rest-1",
      startsAt: new Date("2026-08-20T19:00:00Z"),
      endsAt: new Date("2026-08-20T21:00:00Z"),
    });
    expect(result).toHaveLength(2);
  });

  it("não deve retornar mesa que possui reserva SCHEDULED conflitante", async () => {
    reservationsRepository.items.push({
      id: randomUUID(),
      restaurantId: "rest-1",
      tableId: "tab-1",
      customerId: "cust-1",
      status: "SCHEDULED",
      people: 2,
      startsAt: new Date("2026-08-20T19:00:00Z"),
      endsAt: new Date("2026-08-20T21:00:00Z"),
      observation: null,
    });

    const result = await useCase.execute({
      restaurantId: "rest-1",
      startsAt: new Date("2026-08-20T20:00:00Z"),
      endsAt: new Date("2026-08-20T22:00:00Z"),
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("tab-2");
  });

  it("não deve retornar mesa que possui reserva CONFIRMED conflitante", async () => {
    reservationsRepository.items.push({
      id: randomUUID(),
      restaurantId: "rest-1",
      tableId: "tab-2",
      customerId: "cust-1",
      status: "CONFIRMED",
      people: 4,
      startsAt: new Date("2026-08-20T19:00:00Z"),
      endsAt: new Date("2026-08-20T21:00:00Z"),
      observation: null,
    });

    const result = await useCase.execute({
      restaurantId: "rest-1",
      startsAt: new Date("2026-08-20T19:30:00Z"),
      endsAt: new Date("2026-08-20T20:30:00Z"),
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("tab-1");
  });

  it("deve permitir mesa cuja reserva termina exatamente no startsAt solicitado", async () => {
    reservationsRepository.items.push({
      id: randomUUID(),
      restaurantId: "rest-1",
      tableId: "tab-1",
      customerId: "cust-1",
      status: "SCHEDULED",
      people: 2,
      startsAt: new Date("2026-08-20T18:00:00Z"),
      endsAt: new Date("2026-08-20T20:00:00Z"),
      observation: null,
    });

    const result = await useCase.execute({
      restaurantId: "rest-1",
      startsAt: new Date("2026-08-20T20:00:00Z"),
      endsAt: new Date("2026-08-20T22:00:00Z"),
    });
    expect(result).toHaveLength(2);
  });

  it("deve ignorar reservas CANCELLED, FINISHED e NO_SHOW", async () => {
    ["CANCELLED", "FINISHED", "NO_SHOW"].forEach((status, index) => {
      reservationsRepository.items.push({
        id: randomUUID(),
        restaurantId: "rest-1",
        tableId: index % 2 === 0 ? "tab-1" : "tab-2",
        customerId: "cust-1",
        status: status as any,
        people: 2,
        startsAt: new Date("2026-08-20T19:00:00Z"),
        endsAt: new Date("2026-08-20T21:00:00Z"),
        observation: null,
      });
    });

    const result = await useCase.execute({
      restaurantId: "rest-1",
      startsAt: new Date("2026-08-20T19:00:00Z"),
      endsAt: new Date("2026-08-20T21:00:00Z"),
    });
    expect(result).toHaveLength(2);
  });

  it("deve filtrar por capacidade quando people for informado", async () => {
    const result = await useCase.execute({
      restaurantId: "rest-1",
      startsAt: new Date("2026-08-20T19:00:00Z"),
      endsAt: new Date("2026-08-20T21:00:00Z"),
      people: 3,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("tab-2");
  });

  it("deve rejeitar intervalo onde startsAt >= endsAt", async () => {
    await expect(
      useCase.execute({
        restaurantId: "rest-1",
        startsAt: new Date("2026-08-20T21:00:00Z"),
        endsAt: new Date("2026-08-20T19:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(InvalidTimeRangeError);
  });

  it("deve retornar erro para restaurante inexistente", async () => {
    await expect(
      useCase.execute({
        restaurantId: "invalid-rest",
        startsAt: new Date("2026-08-20T19:00:00Z"),
        endsAt: new Date("2026-08-20T21:00:00Z"),
      }),
    ).rejects.toBeInstanceOf(RestaurantNotFoundError);
  });
});
