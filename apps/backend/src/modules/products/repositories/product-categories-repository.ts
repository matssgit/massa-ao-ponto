export interface CreateProductCategoryData {
  restaurantId: string;
  name: string;
  description?: string | null;
  displayOrder: number;
}

export interface ProductCategory {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  active: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategoriesRepository {
  create(data: CreateProductCategoryData): Promise<ProductCategory>;
  findManyByRestaurantId(restaurantId: string): Promise<ProductCategory[]>;
  findById(id: string): Promise<ProductCategory | null>;
}
