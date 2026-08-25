import { Addon } from "./addons-repository.js";

export interface CreateProductAddonData {
  productId: string;
  addonId: string;
}

export interface ProductAddonsRepository {
  create(data: CreateProductAddonData): Promise<void>;
  delete(data: CreateProductAddonData): Promise<void>;
  exists(data: CreateProductAddonData): Promise<boolean>;
  findAddonsByProductId(productId: string): Promise<Addon[]>;
}
