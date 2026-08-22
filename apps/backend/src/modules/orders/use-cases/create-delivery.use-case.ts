import { DeliveryAlreadyExistsError } from "../errors/delivery-already-exists-error.js";
import { DeliveryTransactionManager } from "../repositories/delivery-transaction-manager.js";
import { InvalidDeliveryOrderTypeError } from "../errors/invalid-delivery-order-type-error.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";

interface CreateDeliveryRequest {
  orderId: string;
}

export class CreateDeliveryUseCase {
  constructor(
    private readonly transactionManager: DeliveryTransactionManager,
  ) {}

  async execute(request: CreateDeliveryRequest) {
    return await this.transactionManager.transaction(
      async ({
        ordersRepository,
        deliveriesRepository,
        deliveryHistoryRepository,
      }) => {
        const order = await ordersRepository.findByIdForUpdate(request.orderId);

        if (!order) throw new OrderNotFoundError();
        if (order.type !== "DELIVERY")
          throw new InvalidDeliveryOrderTypeError(
            "Somente pedidos do tipo DELIVERY podem gerar entregas.",
          );
        if (order.status === "CANCELLED")
          throw new InvalidDeliveryOrderTypeError(
            "Não é possível criar entrega para um pedido cancelado.",
          );
        if (
          !order.deliveryStreet ||
          !order.deliveryNeighborhood ||
          !order.deliveryCity
        ) {
          throw new InvalidDeliveryOrderTypeError(
            "O pedido não possui um endereço de entrega completo.",
          );
        }

        const existingDelivery = await deliveriesRepository.findByOrderId(
          order.id,
        );
        if (existingDelivery) throw new DeliveryAlreadyExistsError();

        const delivery = await deliveriesRepository.create(order.id);

        await deliveryHistoryRepository.create({
          deliveryId: delivery.id,
          action: "DELIVERY_CREATED",
          previousStatus: "PENDING",
          newStatus: "PENDING",
        });

        return delivery;
      },
    );
  }
}
