import { CustomerNotFoundError } from "../errors/customer-not-found-error.js";
import { CustomersRepository } from "../../reservations/repositories/customers-repository.js";

interface GetCustomerRequest {
  restaurantId: string;
  customerId: string;
}

export class GetCustomerUseCase {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async execute({ restaurantId, customerId }: GetCustomerRequest) {
    const customer = await this.customersRepository.findByIdAndRestaurantId(
      customerId,
      restaurantId,
    );

    if (!customer) {
      throw new CustomerNotFoundError();
    }

    return customer;
  }
}
