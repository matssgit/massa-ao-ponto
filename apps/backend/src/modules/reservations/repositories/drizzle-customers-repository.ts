import {
  CreateCustomerData,
  Customer,
  CustomersRepository,
} from "./customers-repository.js";

import { customers, orders, reservations } from "../../../db/schema/index.js";
import { db } from "../../../db/index.js";
import { and, eq, exists, or } from "drizzle-orm";

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

  async createIfNotExists(
    data: CreateCustomerData,
  ): Promise<Customer | null> {
    const [customer] = await this.client
      .insert(customers)
      .values(data)
      .onConflictDoNothing({ target: customers.phone })
      .returning();

    return customer || null;
  }

  async findByIdAndRestaurantId(
    customerId: string,
    restaurantId: string,
  ): Promise<Customer | null> {
    const relatedReservation = this.client
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.customerId, customerId),
          eq(reservations.restaurantId, restaurantId),
        ),
      );
    const relatedOrder = this.client
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.customerId, customerId),
          eq(orders.restaurantId, restaurantId),
        ),
      );

    const [customer] = await this.client
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          or(exists(relatedReservation), exists(relatedOrder)),
        ),
      );

    return customer || null;
  }
}
