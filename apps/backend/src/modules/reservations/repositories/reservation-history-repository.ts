export interface ReservationHistory {
  id: string;
  reservationId: string;
  action: string;
  previousStatus: string | null;
  newStatus: string;
  observation: string | null;
  createdAt: Date;
}

export interface CreateReservationHistoryData {
  reservationId: string;
  action: string;
  previousStatus: string | null;
  newStatus: string;
  observation?: string | null;
}

export interface ReservationHistoryRepository {
  create(data: CreateReservationHistoryData): Promise<ReservationHistory>;
  findByReservationId(reservationId: string): Promise<ReservationHistory[]>;
}
