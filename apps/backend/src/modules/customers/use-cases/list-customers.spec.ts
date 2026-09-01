import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  Customer,
  CustomersRepository,
} from "../../reservations/repositories/customers-repository.js";
import { InMemoryCustomersRepository } from "../../reservations/repositories/in-memory-customers-repository.js";
import { Order } from "../../orders/repositories/orders-repository.js";
import { Reservation } from "../../reservations/repositories/reservations-repository.js";
import { ListCustomersUseCase } from "./list-customers.use-case.js";

describe("ListCustomersUseCase", () => {
  let reservations: Reservation[];
  let orders: Order[];
  let customersRepository: InMemoryCustomersRepository;
  let useCase: ListCustomersUseCase;

  function makeCustomer(
    id: string,
    name: string,
    phone: string,
    email: string | null = null,
  ): Customer {
    return { id, name, phone, email };
  }

  function makeReservation(
    id: string,
    customerId: string,
    restaurantId: string,
  ): Reservation {
    return {
      id,
      restaurantId,
      tableId: `table-${restaurantId}`,
      customerId,
      status: "SCHEDULED",
      people: 2,
      startsAt: new Date("2026-09-01T19:00:00Z"),
      endsAt: new Date("2026-09-01T21:00:00Z"),
      observation: null,
    };
  }

  function makeOrder(
    id: string,
    customerId: string,
    restaurantId: string,
  ): Order {
    return {
      id,
      restaurantId,
      tableId: null,
      customerId,
      type: "PICKUP",
      status: "PENDING",
      paymentStatus: "PENDING",
      subtotal: 1000,
      deliveryFee: 0,
      total: 1000,
      customerName: "Snapshot",
      customerPhone: "11999999999",
      deliveryStreet: null,
      deliveryNumber: null,
      deliveryComplement: null,
      deliveryNeighborhood: null,
      deliveryCity: null,
      deliveryState: null,
      deliveryZipCode: null,
      observation: null,
      createdAt: new Date("2026-09-01T12:00:00Z"),
      updatedAt: new Date("2026-09-01T12:00:00Z"),
    };
  }

  beforeEach(() => {
    reservations = [
      makeReservation("res-alice-r1", "customer-alice", "restaurant-1"),
      makeReservation("res-carla-r1", "customer-carla", "restaurant-1"),
      makeReservation("res-shared-r1", "customer-shared", "restaurant-1"),
      makeReservation("res-other-r2", "customer-other", "restaurant-2"),
    ];
    orders = [
      makeOrder("order-bruno-r1", "customer-bruno", "restaurant-1"),
      makeOrder("order-carla-r1", "customer-carla", "restaurant-1"),
      makeOrder("order-shared-r2", "customer-shared", "restaurant-2"),
    ];
    customersRepository = new InMemoryCustomersRepository(
      reservations,
      orders,
    );
    customersRepository.items.push(
      makeCustomer(
        "customer-alice",
        "Alice",
        "11911112222",
        "alice@example.com",
      ),
      makeCustomer(
        "customer-bruno",
        "Bruno",
        "11922223333",
        "bruno@pizza.test",
      ),
      makeCustomer("customer-carla", "Carla", "11933334444"),
      makeCustomer(
        "customer-shared",
        "Shared",
        "11944445555",
        "shared@example.com",
      ),
      makeCustomer(
        "customer-other",
        "Outro",
        "11955556666",
        "outro@example.com",
      ),
      makeCustomer("customer-global", "Global", "11966667777"),
    );
    useCase = new ListCustomersUseCase(customersRepository);
  });

  it("deve listar relações por Reservation ou Order sem duplicar e sem enumerar globais", async () => {
    const firstTenant = await useCase.execute({
      restaurantId: "restaurant-1",
      page: 1,
      limit: 20,
    });
    const secondTenant = await useCase.execute({
      restaurantId: "restaurant-2",
      page: 1,
      limit: 20,
    });

    expect(firstTenant.data.map(({ id }) => id)).toEqual([
      "customer-alice",
      "customer-bruno",
      "customer-carla",
      "customer-shared",
    ]);
    expect(
      firstTenant.data.filter(({ id }) => id === "customer-carla"),
    ).toHaveLength(1);
    expect(secondTenant.data.map(({ id }) => id)).toEqual([
      "customer-other",
      "customer-shared",
    ]);
  });

  it("deve paginar com ordering name ASC, id ASC e metadata derivada do total", async () => {
    customersRepository.items.push(
      makeCustomer("customer-ana-b", "Ana", "11977778888"),
      makeCustomer("customer-ana-a", "Ana", "11988889999"),
    );
    orders.push(
      makeOrder("order-ana-b", "customer-ana-b", "restaurant-1"),
      makeOrder("order-ana-a", "customer-ana-a", "restaurant-1"),
    );
    const findManySpy = vi.spyOn(customersRepository, "findManyByRestaurantId");
    const countSpy = vi.spyOn(customersRepository, "countByRestaurantId");

    const firstPage = await useCase.execute({
      restaurantId: "restaurant-1",
      page: 1,
      limit: 2,
    });
    const finalPage = await useCase.execute({
      restaurantId: "restaurant-1",
      page: 3,
      limit: 2,
    });

    expect(firstPage.data.map(({ id }) => id)).toEqual([
      "customer-alice",
      "customer-ana-a",
    ]);
    expect(firstPage.meta).toEqual({
      page: 1,
      limit: 2,
      total: 6,
      totalPages: 3,
      hasNext: true,
      hasPrevious: false,
    });
    expect(finalPage.data.map(({ id }) => id)).toEqual([
      "customer-carla",
      "customer-shared",
    ]);
    expect(finalPage.meta).toEqual({
      page: 3,
      limit: 2,
      total: 6,
      totalPages: 3,
      hasNext: false,
      hasPrevious: true,
    });
    expect(findManySpy).toHaveBeenCalledTimes(2);
    expect(countSpy).toHaveBeenCalledTimes(2);
  });

  it("deve buscar por name sem diferenciar maiúsculas", async () => {
    const result = await useCase.execute({
      restaurantId: "restaurant-1",
      search: "aLi",
      page: 1,
      limit: 20,
    });

    expect(result.data.map(({ id }) => id)).toEqual(["customer-alice"]);
    expect(result.meta.total).toBe(1);
  });

  it("deve buscar telefone canônico a partir de search com máscara", async () => {
    const result = await useCase.execute({
      restaurantId: "restaurant-1",
      search: "(11) 92222-3333",
      page: 1,
      limit: 20,
    });

    expect(result.data.map(({ id }) => id)).toEqual(["customer-bruno"]);
    expect(result.meta.total).toBe(1);
  });

  it("deve buscar por email sem diferenciar maiúsculas", async () => {
    const result = await useCase.execute({
      restaurantId: "restaurant-1",
      search: "BRUNO@PIZZA.TEST",
      page: 1,
      limit: 20,
    });

    expect(result.data.map(({ id }) => id)).toEqual(["customer-bruno"]);
    expect(result.meta.total).toBe(1);
  });

  it("deve retornar envelope vazio quando a busca não encontra resultado", async () => {
    const result = await useCase.execute({
      restaurantId: "restaurant-1",
      search: "inexistente",
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

  it("deve manter o total da busca isolado por tenant", async () => {
    const firstTenant = await useCase.execute({
      restaurantId: "restaurant-1",
      search: "shared",
      page: 1,
      limit: 20,
    });
    const secondTenant = await useCase.execute({
      restaurantId: "restaurant-2",
      search: "shared",
      page: 1,
      limit: 20,
    });
    const unrelatedTenant = await useCase.execute({
      restaurantId: "restaurant-3",
      search: "shared",
      page: 1,
      limit: 20,
    });

    expect(firstTenant.meta.total).toBe(1);
    expect(secondTenant.meta.total).toBe(1);
    expect(unrelatedTenant.meta.total).toBe(0);
  });
});
