import {
  CreateCustomerData,
  Customer,
  CustomersRepository,
  ListCustomersFilters,
} from "./customers-repository.js";

import { customers, orders, reservations } from "../../../db/schema/index.js";
import { db } from "../../../db/index.js";
import {
  and,
  asc,
  eq,
  exists,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { normalizeCustomerPhone } from "../../customers/domain/customer-phone.js";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class DrizzleCustomersRepository implements CustomersRepository {
  constructor(private readonly client: typeof db | Transaction = db) {}

  private buildListConditions(filters: ListCustomersFilters) {
    const relatedReservation = this.client
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.customerId, customers.id),
          eq(reservations.restaurantId, filters.restaurantId),
        ),
      );
    const relatedOrder = this.client
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.customerId, customers.id),
          eq(orders.restaurantId, filters.restaurantId),
        ),
      );
    const conditions = [or(exists(relatedReservation), exists(relatedOrder))];

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      const phoneSearch = normalizeCustomerPhone(filters.search);
      const searchConditions = [
        ilike(customers.name, pattern),
        ilike(customers.email, pattern),
      ];

      if (phoneSearch.length > 0) {
        searchConditions.push(ilike(customers.phone, `%${phoneSearch}%`));
      }

      conditions.push(or(...searchConditions));
    }

    return conditions;
  }

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

  async findManyByIds(ids: string[]): Promise<Customer[]> {
    if (ids.length === 0) return [];

    return await this.client
      .select()
      .from(customers)
      .where(inArray(customers.id, ids));
  }

  async findManyByRestaurantId(
    filters: ListCustomersFilters,
  ): Promise<Customer[]> {
    return await this.client
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
      })
      .from(customers)
      .where(and(...this.buildListConditions(filters)))
      .orderBy(asc(customers.name), asc(customers.id))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);
  }

  async countByRestaurantId(filters: ListCustomersFilters): Promise<number> {
    const [result] = await this.client
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(customers)
      .where(and(...this.buildListConditions(filters)));

    return result.total;
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
