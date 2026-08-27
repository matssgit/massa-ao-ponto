import {
  CreateOrderData,
  ListOrdersFilters,
  Order,
  OrderPaymentStatus,
  OrderStatus,
  OrdersRepository,
} from "./orders-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryOrdersRepository implements OrdersRepository {
  public items: Order[] = [];

  async create(data: CreateOrderData): Promise<Order> {
    const order: Order = {
      ...data,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.push(order);
    return order;
  }

  async findById(id: string): Promise<Order | null> {
    return this.items.find((item) => item.id === id) || null;
  }

  async findByIdAndRestaurantId(
    orderId: string,
    restaurantId: string,
  ): Promise<Order | null> {
    return (
      this.items.find(
        (item) =>
          item.id === orderId && item.restaurantId === restaurantId,
      ) || null
    );
  }

  async findByIdAndRestaurantIdForUpdate(
    orderId: string,
    restaurantId: string,
  ): Promise<Order | null> {
    return this.findByIdAndRestaurantId(orderId, restaurantId);
  }

  async findMany(filters: ListOrdersFilters): Promise<Order[]> {
    const offset = (filters.page - 1) * filters.limit;

    return this.items
      .filter((item) => {
        if (item.restaurantId !== filters.restaurantId) return false;
        if (filters.status && item.status !== filters.status) return false;
        if (filters.type && item.type !== filters.type) return false;
        if (filters.customerId && item.customerId !== filters.customerId)
          return false;
        if (filters.startsAt && item.createdAt < filters.startsAt) return false;
        if (filters.endsAt && item.createdAt > filters.endsAt) return false;
        return true;
      })
      .sort((a, b) => {
        const dateDiff = b.createdAt.getTime() - a.createdAt.getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.id.localeCompare(a.id);
      })
      .slice(offset, offset + filters.limit);
  }

  async findByIdForUpdate(id: string): Promise<Order | null> {
    return this.findById(id);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.items[index].status = status;
      this.items[index].updatedAt = new Date();
    }
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: OrderPaymentStatus,
  ): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.items[index].paymentStatus = paymentStatus;
      this.items[index].updatedAt = new Date();
    }
  }

  async findActiveDineInOrderByTableId(tableId: string): Promise<Order | null> {
    const activeStatuses = ["PENDING", "CONFIRMED", "PREPARING", "READY"];
    return (
      this.items.find(
        (o) => o.tableId === tableId && activeStatuses.includes(o.status),
      ) || null
    );
  }
}
