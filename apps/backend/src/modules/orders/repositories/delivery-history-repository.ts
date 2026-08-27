export interface CreateDeliveryHistoryData {
  deliveryId: string;
  action: string;
  previousStatus: string;
  newStatus: string;
  observation?: string | null;
}

export interface DeliveryHistory {
  id: string;
  deliveryId: string;
  action: string;
  previousStatus: string;
  newStatus: string;
  observation: string | null;
  createdAt: Date;
}

export interface DeliveryHistoryRepository {
  create(data: CreateDeliveryHistoryData): Promise<void>;
  findManyByDeliveryId(deliveryId: string): Promise<DeliveryHistory[]>;
}
