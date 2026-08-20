import {
  CreateCustomerData,
  Customer,
  CustomersRepository,
} from "./customers-repository.js";

import { customers } from "../../../db/schema/index.js";
import { db } from "../../../db/index.js";
import { eq } from "drizzle-orm";

export class DrizzleCustomersRepository implements CustomersRepository {
  constructor(private readonly client: any = db) {}

  async findByPhone(phone: string): Promise<Customer | null> {
    const result = await this.client
      .select()
      .from(customers)
      .where(eq(customers.phone, phone));
    return result[0] || null;
  }

  async create(data: CreateCustomerData): Promise<Customer> {
    const result = await this.client.insert(customers).values(data).returning();
    return result[0];
  }

  async findById(id: string): Promise<Customer | null> {
    const result = await this.client
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    return result[0] || null;
  }
}
