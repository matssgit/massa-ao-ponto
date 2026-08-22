import { DeliveriesRepository, Delivery } from "./deliveries-repository.js";

import { db } from "../../../db/index.js";
import { deliveries } from "../../../db/schema/index.js";
import { eq } from "drizzle-orm";

export class DrizzleDeliveriesRepository implements DeliveriesRepository {
  constructor(private readonly client: any = db) {}

  async create(orderId: string): Promise<Delivery> {
    const [delivery] = await this.client
      .insert(deliveries)
      .values({ orderId })
      .returning();
    return delivery;
  }

  async findByOrderId(orderId: string): Promise<Delivery | null> {
    const result = await this.client
      .select()
      .from(deliveries)
      .where(eq(deliveries.orderId, orderId));
    return result[0] || null;
  }

  async findByOrderIdForUpdate(orderId: string): Promise<Delivery | null> {
    const result = await this.client
      .select()
      .from(deliveries)
      .where(eq(deliveries.orderId, orderId))
      .for("update");
    return result[0] || null;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.client
      .update(deliveries)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(deliveries.id, id));
  }
}
