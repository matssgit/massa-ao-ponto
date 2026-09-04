import { z } from "zod";
import { ApiClient, ApiError } from "../../lib/api-client";

const timestamp = z.iso.datetime({ offset: true });
const common = {
  id: z.uuid(), restaurantId: z.uuid(), name: z.string(), description: z.string().nullable(),
  active: z.boolean(), createdAt: timestamp, updatedAt: timestamp,
};
export const categorySchema = z.object({ ...common, displayOrder: z.number().int().nonnegative() });
export const productSchema = z.object({ ...common, categoryId: z.uuid(), price: z.number().int().nonnegative(), displayOrder: z.number().int().nonnegative() });
export const addonSchema = z.object({ ...common, price: z.number().int().nonnegative() });
const categoriesSchema = z.array(categorySchema);
const productsSchema = z.array(productSchema);
const addonsSchema = z.array(addonSchema);

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria."), description: z.string().nullable(), displayOrder: z.number().int().nonnegative("A ordem deve ser zero ou maior."), active: z.boolean().optional(),
});
export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do produto."), description: z.string().nullable(), price: z.number().int().nonnegative(), categoryId: z.uuid("Selecione uma categoria."), displayOrder: z.number().int().nonnegative("A ordem deve ser zero ou maior."), active: z.boolean().optional(),
});
export const addonInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do adicional."), description: z.string().nullable(), price: z.number().int().nonnegative(), active: z.boolean().optional(),
});

export type Category = z.infer<typeof categorySchema>;
export type Product = z.infer<typeof productSchema>;
export type Addon = z.infer<typeof addonSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type AddonInput = z.infer<typeof addonInputSchema>;

function parse<T>(schema: z.ZodType<T>, value: unknown, entity: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(200, "INVALID_RESPONSE", `A API retornou ${entity} em formato inesperado.`);
  return result.data;
}

export class CatalogService {
  constructor(private readonly client: ApiClient) {}
  private root(restaurantId: string, segment: string, id?: string) {
    const root = `/restaurants/${encodeURIComponent(restaurantId)}/${segment}`;
    return id ? `${root}/${encodeURIComponent(id)}` : root;
  }
  async listCategories(restaurantId: string, signal?: AbortSignal) {
    return parse(categoriesSchema, await this.client.request(this.root(restaurantId, "product-categories"), { signal }), "categorias");
  }
  async saveCategory(restaurantId: string, input: CategoryInput, id?: string) {
    const path = this.root(restaurantId, "product-categories", id);
    return parse(categorySchema, await this.client.request(path, { method: id ? "PATCH" : "POST", body: input }), "uma categoria");
  }
  async toggleCategory(restaurantId: string, id: string) {
    return parse(categorySchema, await this.client.request(`${this.root(restaurantId, "product-categories", id)}/toggle-status`, { method: "PATCH" }), "uma categoria");
  }
  async deleteCategory(restaurantId: string, id: string) {
    await this.client.request(this.root(restaurantId, "product-categories", id), { method: "DELETE" });
  }
  async listProducts(restaurantId: string, signal?: AbortSignal) {
    return parse(productsSchema, await this.client.request(this.root(restaurantId, "products"), { signal }), "produtos");
  }
  async saveProduct(restaurantId: string, input: ProductInput, id?: string) {
    return parse(productSchema, await this.client.request(this.root(restaurantId, "products", id), { method: id ? "PATCH" : "POST", body: input }), "um produto");
  }
  async toggleProduct(restaurantId: string, id: string) {
    return parse(productSchema, await this.client.request(`${this.root(restaurantId, "products", id)}/toggle-status`, { method: "PATCH" }), "um produto");
  }
  async deleteProduct(restaurantId: string, id: string) {
    await this.client.request(this.root(restaurantId, "products", id), { method: "DELETE" });
  }
  async listAddons(restaurantId: string, signal?: AbortSignal) {
    return parse(addonsSchema, await this.client.request(this.root(restaurantId, "addons"), { signal }), "adicionais");
  }
  async saveAddon(restaurantId: string, input: AddonInput, id?: string) {
    return parse(addonSchema, await this.client.request(this.root(restaurantId, "addons", id), { method: id ? "PATCH" : "POST", body: input }), "um adicional");
  }
  async toggleAddon(restaurantId: string, id: string) {
    return parse(addonSchema, await this.client.request(`${this.root(restaurantId, "addons", id)}/toggle-status`, { method: "PATCH" }), "um adicional");
  }
  async deleteAddon(restaurantId: string, id: string) {
    await this.client.request(this.root(restaurantId, "addons", id), { method: "DELETE" });
  }
  async listProductAddons(restaurantId: string, productId: string, signal?: AbortSignal) {
    return parse(addonsSchema, await this.client.request(`${this.root(restaurantId, "products", productId)}/addons`, { signal }), "adicionais do produto");
  }
  async setProductAddon(restaurantId: string, productId: string, addonId: string, enabled: boolean) {
    await this.client.request(`${this.root(restaurantId, "products", productId)}/addons/${encodeURIComponent(addonId)}`, { method: enabled ? "POST" : "DELETE", allowEmptyResponse: enabled });
  }
}
