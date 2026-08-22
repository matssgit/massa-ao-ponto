import { DeliveriesRepository, Delivery } from "./deliveries-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryDeliveriesRepository implements DeliveriesRepository {
  public items: Delivery[] = [];

  async create(orderId: string): Promise<Delivery> {
    const delivery: Delivery = {
      id: randomUUID(),
      orderId,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.push(delivery);
    return delivery;
  }

  async findByOrderId(orderId: string): Promise<Delivery | null> {
    return this.items.find((item) => item.orderId === orderId) || null;
  }

  async findByOrderIdForUpdate(orderId: string): Promise<Delivery | null> {
    return this.findByOrderId(orderId);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.items[index].status = status;
      this.items[index].updatedAt = new Date();
    }
  }
}
