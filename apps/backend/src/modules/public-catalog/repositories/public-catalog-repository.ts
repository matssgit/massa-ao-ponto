export interface PublicCatalogCategory {
  id: string;
  name: string;
  displayOrder: number;
}

export interface PublicCatalogProduct {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  displayOrder: number;
}

export interface PublicCatalogAddon {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  price: number;
}

export interface PublicCatalogRepository {
  findByRestaurantId(restaurantId: string): Promise<{
    categories: PublicCatalogCategory[];
    products: PublicCatalogProduct[];
    addons: PublicCatalogAddon[];
  }>;
}
