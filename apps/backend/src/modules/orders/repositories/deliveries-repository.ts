export interface Delivery {
  id: string;
  orderId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveriesRepository {
  create(orderId: string): Promise<Delivery>;
  findByOrderId(orderId: string): Promise<Delivery | null>;
  findByOrderIdForUpdate(orderId: string): Promise<Delivery | null>;
  updateStatus(id: string, status: string): Promise<void>;
}
