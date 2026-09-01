export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

export interface CreateCustomerData {
  name: string;
  phone: string;
  email?: string | null;
}

export interface ListCustomersFilters {
  restaurantId: string;
  search?: string;
  page: number;
  limit: number;
}

export interface CustomersRepository {
  findByPhone(phone: string): Promise<Customer | null>;
  create(data: CreateCustomerData): Promise<Customer>;
  createIfNotExists(data: CreateCustomerData): Promise<Customer | null>;
  findById(id: string): Promise<Customer | null>;
  findManyByIds(ids: string[]): Promise<Customer[]>;
  findManyByRestaurantId(filters: ListCustomersFilters): Promise<Customer[]>;
  countByRestaurantId(filters: ListCustomersFilters): Promise<number>;
  findByIdAndRestaurantId(
    customerId: string,
    restaurantId: string,
  ): Promise<Customer | null>;
}
