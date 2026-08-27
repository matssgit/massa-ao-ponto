export interface CreateAddonData {
  restaurantId: string;
  name: string;
  description?: string | null;
  price: number;
}

export interface UpdateAddonData {
  name?: string;
  description?: string | null;
  price?: number;
  active?: boolean;
}

export interface FindManyAddonsParams {
  restaurantId: string;
  active?: boolean;
}

export interface Addon {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddonsRepository {
  create(data: CreateAddonData): Promise<Addon>;
  findMany(params: FindManyAddonsParams): Promise<Addon[]>;
  findById(id: string): Promise<Addon | null>;
  findByIdAndRestaurantId(
    addonId: string,
    restaurantId: string,
  ): Promise<Addon | null>;
  update(id: string, data: UpdateAddonData): Promise<Addon>;
  delete(id: string): Promise<void>;
}
