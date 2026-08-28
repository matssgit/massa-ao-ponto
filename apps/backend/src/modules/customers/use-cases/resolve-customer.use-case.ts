import {
  MIN_CUSTOMER_PHONE_LENGTH,
  normalizeCustomerPhone,
} from "../domain/customer-phone.js";
import { InvalidCustomerPhoneError } from "../errors/invalid-customer-phone-error.js";
import { CustomersRepository } from "../../reservations/repositories/customers-repository.js";

export interface ResolveCustomerRequest {
  name: string;
  phone: string;
  email?: string | null;
}

export class ResolveCustomerUseCase {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async execute(request: ResolveCustomerRequest) {
    const phone = normalizeCustomerPhone(request.phone);

    if (phone.length < MIN_CUSTOMER_PHONE_LENGTH) {
      throw new InvalidCustomerPhoneError();
    }

    const existingCustomer = await this.customersRepository.findByPhone(phone);
    if (existingCustomer) return existingCustomer;

    const createdCustomer = await this.customersRepository.createIfNotExists({
      name: request.name,
      phone,
      email: request.email,
    });
    if (createdCustomer) return createdCustomer;

    const concurrentCustomer = await this.customersRepository.findByPhone(phone);
    if (!concurrentCustomer) {
      throw new Error("Customer conflict resolution invariant violated.");
    }

    return concurrentCustomer;
  }
}
