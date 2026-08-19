export interface ReservationHistory {
  id: string;
}

export interface CreateReservationHistoryData {
  reservationId: string;
  action: string;
  previousStatus: string | null;
  newStatus: string;
  observation?: string | null;
  createdBy?: string | null;
}

export interface ReservationHistoryRepository {
  create(data: CreateReservationHistoryData): Promise<ReservationHistory>;
}
