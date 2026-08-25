export interface CreateOrderItemAddonData {
  addonId: string;
  addonName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderItemAddon extends CreateOrderItemAddonData {
  id: string;
  createdAt: Date;
}

export interface CreateOrderItemData {
  orderId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  addons?: CreateOrderItemAddonData[];
}

export interface OrderItem extends Omit<CreateOrderItemData, "addons"> {
  id: string;
  createdAt: Date;
  addons?: OrderItemAddon[];
}

export interface OrderItemsRepository {
  createMany(data: CreateOrderItemData[]): Promise<OrderItem[]>;
  findManyByOrderIds(orderIds: string[]): Promise<OrderItem[]>;
  hasByProductId(productId: string): Promise<boolean>;
}
