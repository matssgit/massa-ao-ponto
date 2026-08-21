export class InvalidOrderStatusTransitionError extends Error {
  constructor(currentStatus: string, newStatus: string) {
    super(
      `Não é possível alterar o status do pedido de '${currentStatus}' para '${newStatus}'.`,
    );
    this.name = "InvalidOrderStatusTransitionError";
  }
}
