export interface CreateOrderData {
  restaurantId: string;
  tableId?: string | null;
  customerId: string;
  type: "DELIVERY" | "PICKUP" | "DINE_IN";
  status: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  customerName: string;
  customerPhone: string;
  deliveryStreet: string | null;
  deliveryNumber: string | null;
  deliveryComplement: string | null;
  deliveryNeighborhood: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryZipCode: string | null;
  observation: string | null;
}

export interface Order extends CreateOrderData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  customerId: string;
  tableId?: string | null;
  type: "DELIVERY" | "PICKUP" | "DINE_IN";
}

export interface OrdersRepository {
  create(data: CreateOrderData): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findMany(filters: ListOrdersFilters): Promise<Order[]>;
  findByIdForUpdate(id: string): Promise<Order | null>;
  updateStatus(id: string, status: string): Promise<void>;
  updatePaymentStatus(id: string, paymentStatus: string): Promise<void>;
  findActiveDineInOrderByTableId(tableId: string): Promise<Order | null>;
}

export interface ListOrdersFilters {
  restaurantId: string;
  status?: string;
  type?: string;
  customerId?: string;
  startsAt?: Date;
  endsAt?: Date;
}
