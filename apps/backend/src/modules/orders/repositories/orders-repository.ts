export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type OrderType = "DELIVERY" | "PICKUP" | "DINE_IN";

export type OrderPaymentStatus = "PENDING" | "PAID";

export interface CreateOrderData {
  restaurantId: string;
  tableId?: string | null;
  customerId: string;
  type: OrderType;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
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
  type: OrderType;
}

export interface ListOrdersFilters {
  restaurantId: string;
  status?: OrderStatus;
  type?: OrderType;
  customerId?: string;
  startsAt?: Date;
  endsAt?: Date;
  page: number;
  limit: number;
}

export interface OrdersRepository {
  create(data: CreateOrderData): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByIdAndRestaurantId(
    orderId: string,
    restaurantId: string,
  ): Promise<Order | null>;
  findMany(filters: ListOrdersFilters): Promise<Order[]>;
  findByIdForUpdate(id: string): Promise<Order | null>;
  updateStatus(id: string, status: OrderStatus): Promise<void>;
  updatePaymentStatus(
    id: string,
    paymentStatus: OrderPaymentStatus,
  ): Promise<void>;
  findActiveDineInOrderByTableId(tableId: string): Promise<Order | null>;
}
