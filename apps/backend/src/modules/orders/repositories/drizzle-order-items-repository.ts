import {
  CreateOrderItemData,
  OrderItem,
  OrderItemsRepository,
} from "./order-items-repository.js";
import { eq, inArray } from "drizzle-orm";
import { orderItemAddons, orderItems } from "../../../db/schema/index.js";

import { db } from "../../../db/index.js";
import { randomUUID } from "node:crypto";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class DrizzleOrderItemsRepository implements OrderItemsRepository {
  constructor(private readonly client: typeof db | Transaction = db) {}

  async createMany(data: CreateOrderItemData[]): Promise<OrderItem[]> {
    if (data.length === 0) return [];

    const itemsToInsert = data.map((item) => ({
      id: randomUUID(),
      orderId: item.orderId,
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
    }));

    const insertedItems = await this.client
      .insert(orderItems)
      .values(itemsToInsert)
      .returning();

    const addonsToInsert = data.flatMap((item, index) => {
      if (!item.addons?.length) return [];

      return item.addons.map((addon) => ({
        id: randomUUID(),
        orderItemId: itemsToInsert[index].id,
        addonId: addon.addonId,
        addonName: addon.addonName,
        unitPrice: addon.unitPrice,
        quantity: addon.quantity,
        subtotal: addon.subtotal,
      }));
    });

    const dbAddons =
      addonsToInsert.length > 0
        ? await this.client
            .insert(orderItemAddons)
            .values(addonsToInsert)
            .returning()
        : [];

    return insertedItems.map((item) => {
      const itemAddons = dbAddons
        .filter((a) => a.orderItemId === item.id)
        .map((a) => ({
          id: a.id,
          addonId: a.addonId,
          addonName: a.addonName,
          unitPrice: a.unitPrice,
          quantity: a.quantity,
          subtotal: a.subtotal,
          createdAt: a.createdAt,
        }));

      return {
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
        createdAt: item.createdAt,
        addons: itemAddons.length > 0 ? itemAddons : undefined,
      };
    });
  }

  async findManyByOrderIds(orderIds: string[]): Promise<OrderItem[]> {
    if (orderIds.length === 0) return [];

    const items = await this.client
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    if (items.length === 0) return [];

    const itemIds = items.map((i) => i.id);

    const addonsDb = await this.client
      .select()
      .from(orderItemAddons)
      .where(inArray(orderItemAddons.orderItemId, itemIds));

    const addonsMap = new Map<string, typeof addonsDb>();

    for (const addon of addonsDb) {
      const list = addonsMap.get(addon.orderItemId) || [];
      list.push(addon);
      addonsMap.set(addon.orderItemId, list);
    }

    return items.map((item) => {
      const itemAddons = addonsMap.get(item.id);

      return {
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
        createdAt: item.createdAt,
        addons: itemAddons && itemAddons.length > 0 ? itemAddons : undefined,
      };
    });
  }

  async hasByProductId(productId: string): Promise<boolean> {
    const [result] = await this.client
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.productId, productId))
      .limit(1);
    return !!result;
  }
}
