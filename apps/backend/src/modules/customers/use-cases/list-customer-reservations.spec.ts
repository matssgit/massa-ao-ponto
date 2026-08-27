import { beforeEach, describe, expect, it } from "vitest";

import { CustomerNotFoundError } from "../errors/customer-not-found-error.js";
import { InMemoryCustomersRepository } from "../../reservations/repositories/in-memory-customers-repository.js";
import { InMemoryOrdersRepository } from "../../orders/repositories/in-memory-orders-repository.js";
import { InMemoryReservationsRepository } from "../../reservations/repositories/in-memory-reservations-repository.js";
import { ListCustomerReservationsUseCase } from "./list-customer.reservations.use-case.js";
import { randomUUID } from "node:crypto";

describe("ListCustomerReservationsUseCase", () => {
  let customersRepository: InMemoryCustomersRepository;
  let reservationsRepository: InMemoryReservationsRepository;
  let ordersRepository: InMemoryOrdersRepository;
  let useCase: ListCustomerReservationsUseCase;

  beforeEach(() => {
    reservationsRepository = new InMemoryReservationsRepository();
    ordersRepository = new InMemoryOrdersRepository();
    customersRepository = new InMemoryCustomersRepository(
      reservationsRepository.items,
      ordersRepository.items,
    );
    useCase = new ListCustomerReservationsUseCase(
      customersRepository,
      reservationsRepository,
    );
  });

  function createCustomer() {
    const id = randomUUID();
    customersRepository.items.push({
      id,
      name: "Cliente Teste",
      phone: "11999999999",
      email: null,
    });
    return id;
  }

  function addReservation(
    id: string,
    customerId: string,
    restaurantId: string,
    startsAt: string,
  ) {
    reservationsRepository.items.push({
      id,
      restaurantId,
      tableId: randomUUID(),
      customerId,
      status: "SCHEDULED",
      people: 2,
      startsAt: new Date(startsAt),
      endsAt: new Date(new Date(startsAt).getTime() + 7_200_000),
      observation: null,
    });
  }

  async function relateByOrder(customerId: string, restaurantId: string) {
    await ordersRepository.create({
      restaurantId,
      customerId,
      type: "PICKUP",
      status: "PENDING",
      paymentStatus: "PENDING",
      subtotal: 1000,
      deliveryFee: 0,
      total: 1000,
      customerName: "Cliente Teste",
      customerPhone: "11999999999",
      deliveryStreet: null,
      deliveryNumber: null,
      deliveryComplement: null,
      deliveryNeighborhood: null,
      deliveryCity: null,
      deliveryState: null,
      deliveryZipCode: null,
      observation: null,
    });
  }

  it("deve retornar somente Reservations do Restaurant informado", async () => {
    const customerId = createCustomer();
    const firstRestaurantId = randomUUID();
    const secondRestaurantId = randomUUID();
    addReservation("res-a", customerId, firstRestaurantId, "2026-08-20T19:00:00Z");
    addReservation("res-b", customerId, secondRestaurantId, "2026-08-21T19:00:00Z");

    const firstResult = await useCase.execute({
      restaurantId: firstRestaurantId,
      customerId,
    });
    const secondResult = await useCase.execute({
      restaurantId: secondRestaurantId,
      customerId,
    });

    expect(firstResult.map((item) => item.id)).toEqual(["res-a"]);
    expect(secondResult.map((item) => item.id)).toEqual(["res-b"]);
  });

  it("deve retornar array vazio quando a relação existe apenas via Order", async () => {
    const customerId = createCustomer();
    const restaurantId = randomUUID();
    await relateByOrder(customerId, restaurantId);

    await expect(
      useCase.execute({ restaurantId, customerId }),
    ).resolves.toEqual([]);
  });

  it("deve ocultar customer sem relação com o Restaurant", async () => {
    const customerId = createCustomer();
    addReservation("res-a", customerId, randomUUID(), "2026-08-20T19:00:00Z");

    await expect(
      useCase.execute({ restaurantId: randomUUID(), customerId }),
    ).rejects.toBeInstanceOf(CustomerNotFoundError);
  });

  it("deve rejeitar customer inexistente", async () => {
    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        customerId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(CustomerNotFoundError);
  });

  it("deve ordenar por startsAt e usar id como critério secundário", async () => {
    const customerId = createCustomer();
    const restaurantId = randomUUID();
    addReservation("res-b", customerId, restaurantId, "2026-08-20T21:00:00Z");
    addReservation("res-a2", customerId, restaurantId, "2026-08-20T19:00:00Z");
    addReservation("res-a1", customerId, restaurantId, "2026-08-20T19:00:00Z");

    const result = await useCase.execute({ restaurantId, customerId });

    expect(result.map((item) => item.id)).toEqual([
      "res-a1",
      "res-a2",
      "res-b",
    ]);
  });
});
