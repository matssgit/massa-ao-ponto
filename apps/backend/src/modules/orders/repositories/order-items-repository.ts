export interface CreateOrderItemData {
  orderId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderItem extends CreateOrderItemData {
  id: string;
  createdAt: Date;
}

export interface OrderItemsRepository {
  createMany(data: CreateOrderItemData[]): Promise<OrderItem[]>;
  findManyByOrderIds(orderIds: string[]): Promise<OrderItem[]>;
}
