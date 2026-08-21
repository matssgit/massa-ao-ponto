export interface CreateProductData {
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  displayOrder: number;
}

export interface Product {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FindManyProductsFilters {
  restaurantId: string;
  categoryId?: string;
  active?: boolean;
}

export interface ProductsRepository {
  create(data: CreateProductData): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findMany(filters: FindManyProductsFilters): Promise<Product[]>;
}
