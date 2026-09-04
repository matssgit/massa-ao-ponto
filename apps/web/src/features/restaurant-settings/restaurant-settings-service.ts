import { z } from "zod";
import { ApiClient, ApiError } from "../../lib/api-client";

const timestamp = z.iso.datetime({ offset: true });
export const restaurantSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  timezone: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const restaurantSettingsInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do restaurante.").max(255, "O nome deve ter no máximo 255 caracteres."),
  address: z.string().trim().min(1, "Informe o endereço.").max(255, "O endereço deve ter no máximo 255 caracteres."),
  phone: z.string().trim().min(1, "Informe o telefone.").max(50, "O telefone deve ter no máximo 50 caracteres."),
  timezone: z.string().trim().min(1, "Informe o timezone.").max(100, "O timezone deve ter no máximo 100 caracteres."),
});

export type RestaurantDetails = z.infer<typeof restaurantSchema>;
export type RestaurantSettingsInput = z.infer<typeof restaurantSettingsInputSchema>;
export type RestaurantSettingsChanges = Partial<RestaurantSettingsInput>;

function parse(value: unknown): RestaurantDetails {
  const result = restaurantSchema.safeParse(value);
  if (!result.success) throw new ApiError(200, "INVALID_RESPONSE", "A API retornou o restaurante em formato inesperado.");
  return result.data;
}

export class RestaurantSettingsService {
  constructor(private readonly client: ApiClient) {}
  private path(restaurantId: string) {
    return `/restaurants/${encodeURIComponent(restaurantId)}`;
  }
  async get(restaurantId: string, signal?: AbortSignal) {
    return parse(await this.client.request(this.path(restaurantId), { signal }));
  }
  async update(restaurantId: string, changes: RestaurantSettingsChanges) {
    return parse(await this.client.request(this.path(restaurantId), { method: "PATCH", body: changes }));
  }
}
