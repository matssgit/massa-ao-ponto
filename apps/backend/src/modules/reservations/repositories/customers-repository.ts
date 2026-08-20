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
  findById(id: string): Promise<Customer | null>;
}

export interface CustomersRepository {
  create(data: CreateCustomerData): Promise<Customer>;
  findByPhone(phone: string): Promise<Customer | null>;
  findById(id: string): Promise<Customer | null>;
}
