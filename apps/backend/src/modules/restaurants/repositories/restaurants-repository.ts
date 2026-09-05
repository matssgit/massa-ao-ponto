export interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  timezone: string;
  slug: string | null;
  publicEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRestaurantInput {
  name: string;
  address: string;
  phone: string;
  timezone: string;
}

export interface UpdateRestaurantInput {
  name?: string;
  address?: string;
  phone?: string;
  timezone?: string;
  slug?: string | null;
  publicEnabled?: boolean;
}

export interface RestaurantsRepository {
  create(data: CreateRestaurantInput): Promise<Restaurant>;
  findById(id: string): Promise<Restaurant | null>;
  findBySlug(slug: string): Promise<Restaurant | null>;
  findPublishedBySlug(slug: string): Promise<Restaurant | null>;
  findAll(): Promise<Restaurant[]>;
  update(id: string, data: UpdateRestaurantInput): Promise<Restaurant | null>;
}
