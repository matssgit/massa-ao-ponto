export interface CreateOrderHistoryData {
  orderId: string;
  action: string;
  previousStatus: string | null;
  newStatus: string;
  observation: string | null;
}

export interface OrderHistory extends CreateOrderHistoryData {
  id: string;
  createdAt: Date;
}

export interface OrderHistoryRepository {
  create(data: CreateOrderHistoryData): Promise<OrderHistory>;
  findManyByOrderId(orderId: string): Promise<OrderHistory[]>;
}
