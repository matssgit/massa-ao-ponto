import { CustomersRepository } from "../../reservations/repositories/customers-repository.js";

interface ListCustomersRequest {
  restaurantId: string;
  search?: string;
  page: number;
  limit: number;
}

export class ListCustomersUseCase {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async execute(request: ListCustomersRequest) {
    const [customers, total] = await Promise.all([
      this.customersRepository.findManyByRestaurantId(request),
      this.customersRepository.countByRestaurantId(request),
    ]);
    const totalPages = total === 0 ? 0 : Math.ceil(total / request.limit);

    return {
      data: customers,
      meta: {
        page: request.page,
        limit: request.limit,
        total,
        totalPages,
        hasNext: request.page < totalPages,
        hasPrevious: request.page > 1,
      },
    };
  }
}
