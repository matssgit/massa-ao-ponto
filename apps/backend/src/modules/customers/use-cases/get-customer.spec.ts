import { beforeEach, describe, expect, it } from "vitest";

import { CustomerNotFoundError } from "../errors/customer-not-found-error.js";
import { GetCustomerUseCase } from "./get-customer.use-case.js";
import { InMemoryCustomersRepository } from "../../reservations/repositories/in-memory-customers-repository.js";
import { InMemoryOrdersRepository } from "../../orders/repositories/in-memory-orders-repository.js";
import { InMemoryReservationsRepository } from "../../reservations/repositories/in-memory-reservations-repository.js";
import { randomUUID } from "node:crypto";

describe("GetCustomerUseCase", () => {
  let customersRepository: InMemoryCustomersRepository;
  let reservationsRepository: InMemoryReservationsRepository;
  let ordersRepository: InMemoryOrdersRepository;
  let useCase: GetCustomerUseCase;

  beforeEach(() => {
    reservationsRepository = new InMemoryReservationsRepository();
    ordersRepository = new InMemoryOrdersRepository();
    customersRepository = new InMemoryCustomersRepository(
      reservationsRepository.items,
      ordersRepository.items,
    );
    useCase = new GetCustomerUseCase(customersRepository);
  });

  function createCustomer() {
    const id = randomUUID();
    customersRepository.items.push({
      id,
      name: "João Silva",
      phone: "11999999999",
      email: "joao@email.com",
    });
    return id;
  }

  async function relateByReservation(customerId: string, restaurantId: string) {
    await reservationsRepository.create({
      restaurantId,
      tableId: randomUUID(),
      customerId,
      status: "SCHEDULED",
      people: 2,
      startsAt: new Date("2026-08-20T19:00:00Z"),
      endsAt: new Date("2026-08-20T21:00:00Z"),
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
      customerName: "João Silva",
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

  it("deve retornar customer relacionado via Reservation", async () => {
    const customerId = createCustomer();
    const restaurantId = randomUUID();
    await relateByReservation(customerId, restaurantId);

    await expect(
      useCase.execute({ restaurantId, customerId }),
    ).resolves.toMatchObject({ id: customerId, name: "João Silva" });
  });

  it("deve retornar customer relacionado apenas via Order", async () => {
    const customerId = createCustomer();
    const restaurantId = randomUUID();
    await relateByOrder(customerId, restaurantId);

    await expect(
      useCase.execute({ restaurantId, customerId }),
    ).resolves.toMatchObject({ id: customerId });
  });

  it("deve ocultar customer relacionado somente a outro tenant", async () => {
    const customerId = createCustomer();
    await relateByReservation(customerId, randomUUID());

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

  it("deve permitir acesso pelos dois Restaurants relacionados", async () => {
    const customerId = createCustomer();
    const firstRestaurantId = randomUUID();
    const secondRestaurantId = randomUUID();
    await relateByReservation(customerId, firstRestaurantId);
    await relateByOrder(customerId, secondRestaurantId);

    await expect(
      useCase.execute({ restaurantId: firstRestaurantId, customerId }),
    ).resolves.toMatchObject({ id: customerId });
    await expect(
      useCase.execute({ restaurantId: secondRestaurantId, customerId }),
    ).resolves.toMatchObject({ id: customerId });
  });
});
