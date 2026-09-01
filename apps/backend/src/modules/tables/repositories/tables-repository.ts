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

export interface UpdateTableInput {
  number?: string;
  capacity?: number;
  type?: string;
  active?: boolean;
}

export interface TablesRepository {
  create(data: CreateTableInput): Promise<Table>;
  findByRestaurantId(restaurantId: string): Promise<Table[]>;
  findManyByIdsAndRestaurantId(
    ids: string[],
    restaurantId: string,
  ): Promise<Table[]>;
  findByRestaurantAndNumber(
    restaurantId: string,
    number: string,
  ): Promise<Table | null>;
  findByIdAndRestaurantId(
    tableId: string,
    restaurantId: string,
  ): Promise<Table | null>;
  updateByIdAndRestaurantId(
    tableId: string,
    restaurantId: string,
    data: UpdateTableInput,
  ): Promise<Table | null>;
  findByIdForUpdate(id: string): Promise<Table | null>;
  findManyActiveByRestaurantId(
    restaurantId: string,
    minCapacity?: number,
  ): Promise<Table[]>;
}
