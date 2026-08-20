import { beforeEach, describe, expect, it } from "vitest";

import { CustomerNotFoundError } from "../errors/customer-not-found-error.js";
import { GetCustomerUseCase } from "./get-customer.use-case.js";
import { InMemoryCustomersRepository } from "../../reservations/repositories/in-memory-customers-repository.js";
import { randomUUID } from "node:crypto";

describe("GetCustomerUseCase", () => {
  let customersRepository: InMemoryCustomersRepository;
  let useCase: GetCustomerUseCase;

  beforeEach(() => {
    customersRepository = new InMemoryCustomersRepository();
    useCase = new GetCustomerUseCase(customersRepository);
  });

  it("deve retornar customer existente", async () => {
    const id = randomUUID();
    customersRepository.items.push({
      id,
      name: "João Silva",
      phone: "11999999999",
      email: "joao@email.com",
    });

    const result = await useCase.execute({ customerId: id });
    expect(result.id).toBe(id);
    expect(result.name).toBe("João Silva");
  });

  it("deve lançar CustomerNotFoundError quando não existir", async () => {
    await expect(
      useCase.execute({ customerId: randomUUID() }),
    ).rejects.toBeInstanceOf(CustomerNotFoundError);
  });
});
