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

export interface CustomersRepository {
  findByPhone(phone: string): Promise<Customer | null>;
  create(data: CreateCustomerData): Promise<Customer>;
  createIfNotExists(data: CreateCustomerData): Promise<Customer | null>;
  findById(id: string): Promise<Customer | null>;
  findByIdAndRestaurantId(
    customerId: string,
    restaurantId: string,
  ): Promise<Customer | null>;
}
