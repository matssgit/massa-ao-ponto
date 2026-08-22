export interface CreateDeliveryHistoryData {
  deliveryId: string;
  action: string;
  previousStatus: string;
  newStatus: string;
  observation?: string | null;
}

export interface DeliveryHistoryRepository {
  create(data: CreateDeliveryHistoryData): Promise<void>;
}
