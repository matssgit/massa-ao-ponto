import { CustomerNotFoundError } from "../errors/customer-not-found-error.js";
import { CustomersRepository } from "../../reservations/repositories/customers-repository.js";
import { ReservationsRepository } from "../../reservations/repositories/reservations-repository.js";

interface ListCustomerReservationsRequest {
  restaurantId: string;
  customerId: string;
}

export class ListCustomerReservationsUseCase {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly reservationsRepository: ReservationsRepository,
  ) {}

  async execute({ restaurantId, customerId }: ListCustomerReservationsRequest) {
    const customer = await this.customersRepository.findByIdAndRestaurantId(
      customerId,
      restaurantId,
    );

    if (!customer) {
      throw new CustomerNotFoundError();
    }

    return await this.reservationsRepository.findByCustomerIdAndRestaurantId(
      customerId,
      restaurantId,
    );
  }
}
