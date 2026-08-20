import { beforeEach, describe, expect, it } from "vitest";

import { CustomerNotFoundError } from "../errors/customer-not-found-error.js";
import { InMemoryCustomersRepository } from "../../reservations/repositories/in-memory-customers-repository.js";
import { InMemoryReservationsRepository } from "../../reservations/repositories/in-memory-reservations-repository.js";
import { ListCustomerReservationsUseCase } from "./list-customer.reservations.use-case.js";
import { randomUUID } from "node:crypto";

describe("ListCustomerReservationsUseCase", () => {
  let customersRepository: InMemoryCustomersRepository;
  let reservationsRepository: InMemoryReservationsRepository;
  let useCase: ListCustomerReservationsUseCase;

  beforeEach(() => {
    customersRepository = new InMemoryCustomersRepository();
    reservationsRepository = new InMemoryReservationsRepository();
    useCase = new ListCustomerReservationsUseCase(
      customersRepository,
      reservationsRepository,
    );
  });

  function createCustomer(id: string) {
    customersRepository.items.push({
      id,
      name: "Cliente Teste",
      phone: "11999999999",
      email: null,
    });
  }

  it("deve retornar array vazio quando não houver reservas", async () => {
    const customerId = randomUUID();
    createCustomer(customerId);

    const result = await useCase.execute({ customerId });
    expect(result).toEqual([]);
  });

  it("deve rejeitar customer inexistente", async () => {
    await expect(
      useCase.execute({ customerId: randomUUID() }),
    ).rejects.toBeInstanceOf(CustomerNotFoundError);
  });

  it("deve retornar reservas do customer e manter isolamento entre customers", async () => {
    const customer1 = randomUUID();
    const customer2 = randomUUID();
    createCustomer(customer1);
    createCustomer(customer2);

    reservationsRepository.items.push(
      {
        id: "res-1",
        restaurantId: "rest-1",
        tableId: "tab-1",
        customerId: customer1,
        status: "SCHEDULED",
        people: 2,
        startsAt: new Date("2026-08-20T19:00:00Z"),
        endsAt: new Date("2026-08-20T21:00:00Z"),
        observation: null,
      },
      {
        id: "res-2",
        restaurantId: "rest-1",
        tableId: "tab-1",
        customerId: customer2,
        status: "SCHEDULED",
        people: 2,
        startsAt: new Date("2026-08-20T19:00:00Z"),
        endsAt: new Date("2026-08-20T21:00:00Z"),
        observation: null,
      },
    );

    const result = await useCase.execute({ customerId: customer1 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("res-1");
  });

  it("deve manter ordenação por startsAt e usar id como critério secundário", async () => {
    const customerId = randomUUID();
    createCustomer(customerId);

    reservationsRepository.items.push(
      {
        id: "res-b",
        restaurantId: "rest-1",
        tableId: "tab-1",
        customerId,
        status: "SCHEDULED",
        people: 2,
        startsAt: new Date("2026-08-20T21:00:00Z"),
        endsAt: new Date("2026-08-20T23:00:00Z"),
        observation: null,
      },
      {
        id: "res-a2",
        restaurantId: "rest-1",
        tableId: "tab-2",
        customerId,
        status: "SCHEDULED",
        people: 2,
        startsAt: new Date("2026-08-20T19:00:00Z"),
        endsAt: new Date("2026-08-20T21:00:00Z"),
        observation: null,
      },
      {
        id: "res-a1",
        restaurantId: "rest-1",
        tableId: "tab-1",
        customerId,
        status: "SCHEDULED",
        people: 2,
        startsAt: new Date("2026-08-20T19:00:00Z"),
        endsAt: new Date("2026-08-20T21:00:00Z"),
        observation: null,
      },
    );

    const result = await useCase.execute({ customerId });
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("res-a1");
    expect(result[1].id).toBe("res-a2");
    expect(result[2].id).toBe("res-b");
  });
});
