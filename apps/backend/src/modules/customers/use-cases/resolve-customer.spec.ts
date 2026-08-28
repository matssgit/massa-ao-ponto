import { describe, expect, it } from "vitest";

import { InvalidCustomerPhoneError } from "../errors/invalid-customer-phone-error.js";
import { InMemoryCustomersRepository } from "../../reservations/repositories/in-memory-customers-repository.js";
import { ResolveCustomerUseCase } from "./resolve-customer.use-case.js";

describe("ResolveCustomerUseCase", () => {
  it("cria o customer com telefone canônico", async () => {
    const repository = new InMemoryCustomersRepository();
    const customer = await new ResolveCustomerUseCase(repository).execute({
      name: "Maria",
      phone: "(11) 99999-9999",
      email: "maria@example.com",
    });

    expect(customer.phone).toBe("11999999999");
    expect(repository.items).toHaveLength(1);
  });

  it("reutiliza o customer sem sobrescrever seus dados", async () => {
    const repository = new InMemoryCustomersRepository();
    const existing = await repository.create({
      name: "Nome original",
      phone: "11999999999",
      email: "original@example.com",
    });

    const resolved = await new ResolveCustomerUseCase(repository).execute({
      name: "Nome recebido",
      phone: "11 99999-9999",
      email: "novo@example.com",
    });

    expect(resolved).toEqual(existing);
    expect(repository.items).toHaveLength(1);
  });

  it("reconsulta o vencedor quando há conflito concorrente", async () => {
    class ConcurrentRepository extends InMemoryCustomersRepository {
      async createIfNotExists() {
        await this.create({ name: "Vencedor", phone: "11999999999" });
        return null;
      }
    }

    const repository = new ConcurrentRepository();
    const resolved = await new ResolveCustomerUseCase(repository).execute({
      name: "Concorrente",
      phone: "(11) 99999-9999",
    });

    expect(resolved.name).toBe("Vencedor");
    expect(repository.items).toHaveLength(1);
  });

  it("rejeita telefone com menos de dez dígitos após normalização", async () => {
    const useCase = new ResolveCustomerUseCase(
      new InMemoryCustomersRepository(),
    );

    await expect(
      useCase.execute({ name: "Maria", phone: "(11) 9999-999" }),
    ).rejects.toBeInstanceOf(InvalidCustomerPhoneError);
  });
});
