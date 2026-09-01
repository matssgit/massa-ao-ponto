import {
  CreateCustomerData,
  Customer,
  CustomersRepository,
  ListCustomersFilters,
} from "./customers-repository.js";
import { Order } from "../../orders/repositories/orders-repository.js";
import { Reservation } from "./reservations-repository.js";
import { normalizeCustomerPhone } from "../../customers/domain/customer-phone.js";

import { randomUUID } from "node:crypto";

export class InMemoryCustomersRepository implements CustomersRepository {
  public items: Customer[] = [];

  constructor(
    private readonly reservations: Reservation[] = [],
    private readonly orders: Order[] = [],
  ) {}

  private matchesFilters(
    customer: Customer,
    filters: ListCustomersFilters,
  ): boolean {
    const hasRelationship =
      this.reservations.some(
        (reservation) =>
          reservation.customerId === customer.id &&
          reservation.restaurantId === filters.restaurantId,
      ) ||
      this.orders.some(
        (order) =>
          order.customerId === customer.id &&
          order.restaurantId === filters.restaurantId,
      );

    if (!hasRelationship) return false;
    if (!filters.search) return true;

    const search = filters.search.toLocaleLowerCase();
    const phoneSearch = normalizeCustomerPhone(filters.search);

    return (
      customer.name.toLocaleLowerCase().includes(search) ||
      customer.email?.toLocaleLowerCase().includes(search) === true ||
      (phoneSearch.length > 0 && customer.phone.includes(phoneSearch))
    );
  }

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

  async findById(id: string): Promise<Customer | null> {
    return this.items.find((item) => item.id === id) || null;
  }

  async findManyByIds(ids: string[]): Promise<Customer[]> {
    return this.items.filter((item) => ids.includes(item.id));
  }

  async findManyByRestaurantId(
    filters: ListCustomersFilters,
  ): Promise<Customer[]> {
    const offset = (filters.page - 1) * filters.limit;

    return this.items
      .filter((customer) => this.matchesFilters(customer, filters))
      .sort((a, b) => {
        const nameComparison = a.name.localeCompare(b.name);
        if (nameComparison !== 0) return nameComparison;
        return a.id.localeCompare(b.id);
      })
      .slice(offset, offset + filters.limit);
  }

  async countByRestaurantId(filters: ListCustomersFilters): Promise<number> {
    return this.items.filter((customer) =>
      this.matchesFilters(customer, filters),
    ).length;
  }

  async createIfNotExists(
    data: CreateCustomerData,
  ): Promise<Customer | null> {
    if (await this.findByPhone(data.phone)) return null;
    return this.create(data);
  }

  async findByIdAndRestaurantId(
    customerId: string,
    restaurantId: string,
  ): Promise<Customer | null> {
    const customer = await this.findById(customerId);
    if (!customer) return null;

    const hasReservation = this.reservations.some(
      (reservation) =>
        reservation.customerId === customerId &&
        reservation.restaurantId === restaurantId,
    );
    const hasOrder = this.orders.some(
      (order) =>
        order.customerId === customerId &&
        order.restaurantId === restaurantId,
    );

    return hasReservation || hasOrder ? customer : null;
  }
}
