import { CustomerNotFoundError } from "../errors/customer-not-found-error.js";
import { CustomersRepository } from "../../reservations/repositories/customers-repository.js";

interface GetCustomerRequest {
  customerId: string;
}

export class GetCustomerUseCase {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async execute({ customerId }: GetCustomerRequest) {
    const customer = await this.customersRepository.findById(customerId);

    if (!customer) {
      throw new CustomerNotFoundError();
    }

    return customer;
  }
}
