export interface CreateProductCategoryData {
  restaurantId: string;
  name: string;
  description?: string | null;
  displayOrder: number;
}

export interface UpdateProductCategoryData {
  name?: string;
  description?: string | null;
  displayOrder?: number;
  active?: boolean;
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
  findMany(restaurantId: string): Promise<ProductCategory[]>;
  findById(id: string): Promise<ProductCategory | null>;
  findByIdAndRestaurantId(
    categoryId: string,
    restaurantId: string,
  ): Promise<ProductCategory | null>;
  update(id: string, data: UpdateProductCategoryData): Promise<ProductCategory>;
  delete(id: string): Promise<void>;
}
