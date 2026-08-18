export interface Table {
  id: string;
  restaurantId: string;
  number: string;
  capacity: number;
  type: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTableInput {
  restaurantId: string;
  number: string;
  capacity: number;
  type: string;
}

export interface TablesRepository {
  create(data: CreateTableInput): Promise<Table>;
  findByRestaurantId(restaurantId: string): Promise<Table[]>;
}
