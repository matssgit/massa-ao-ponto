import {
  CreateCustomerData,
  Customer,
  CustomersRepository,
} from "./customers-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryCustomersRepository implements CustomersRepository {
  public items: Customer[] = [];

  async findByPhone(phone: string): Promise<Customer | null> {
    return this.items.find((item) => item.phone === phone) || null;
  }

  async create(data: CreateCustomerData): Promise<Customer> {
    const customer: Customer = {
      id: randomUUID(),
      name: data.name,
      phone: data.phone,
      email: data.email || null,
    };
    this.items.push(customer);
    return customer;
  }
}
