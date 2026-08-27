import {
  CreateCustomerData,
  Customer,
  CustomersRepository,
} from "./customers-repository.js";
import { Order } from "../../orders/repositories/orders-repository.js";
import { Reservation } from "./reservations-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryCustomersRepository implements CustomersRepository {
  public items: Customer[] = [];

  constructor(
    private readonly reservations: Reservation[] = [],
    private readonly orders: Order[] = [],
  ) {}

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
