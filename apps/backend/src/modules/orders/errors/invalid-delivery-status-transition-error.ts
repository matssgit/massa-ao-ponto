export class InvalidDeliveryStatusTransitionError extends Error {
  constructor(currentStatus: string, newStatus: string) {
    super(
      `Não é possível alterar o status do delivery de '${currentStatus}' para '${newStatus}'.`,
    );
    this.name = "InvalidDeliveryStatusTransitionError";
  }
}
