export class InvalidReservationStatusTransitionError extends Error {
  constructor(currentStatus: string, newStatus: string) {
    super(
      `Não é permitido alterar a reserva do status ${currentStatus} para o status ${newStatus}.`,
    );
    this.name = "InvalidReservationStatusTransitionError";
  }
}
