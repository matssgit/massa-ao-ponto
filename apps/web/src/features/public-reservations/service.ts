import { z } from "zod";
import { ApiClient, ApiError } from "../../lib/api-client";
import { availabilitySchema, createdSchema, detailsSchema, publicCatalogSchema, restaurantSchema, tokenSchema, type CreateInput, type Period } from "./schemas";
const publicOptions = { csrf: false, credentials: "omit", referrerPolicy: "no-referrer" } as const;
function decode<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ApiError(200, "INVALID_RESPONSE", "Não foi possível ler a resposta. Tente novamente.");
  return result.data;
}
export class PublicReservationService {
  constructor(private readonly client: ApiClient) {}
  private root(slug: string) { return `/public/restaurants/${encodeURIComponent(slug)}`; }
  restaurant(slug: string, signal?: AbortSignal) {
    return this.client.request(this.root(slug), { ...publicOptions, signal }).then(data => decode(restaurantSchema, data));
  }
  catalog(slug: string, signal?: AbortSignal) {
    return this.client.request(`${this.root(slug)}/catalog`, { ...publicOptions, signal }).then(data => decode(publicCatalogSchema, data));
  }
  availability(slug: string, period: Period, signal?: AbortSignal) {
    const query = new URLSearchParams({ startsAt: period.startsAt, endsAt: period.endsAt, partySize: String(period.partySize) });
    return this.client.request(`${this.root(slug)}/reservations/availability?${query}`, { ...publicOptions, signal }).then(data => decode(availabilitySchema, data));
  }
  create(slug: string, input: CreateInput) {
    return this.client.request(`${this.root(slug)}/reservations`, { ...publicOptions, method: "POST", body: input }).then(data => decode(createdSchema, data));
  }
  private tokenPath(token: string) {
    if (!tokenSchema.safeParse(token).success) throw new ApiError(404, "PUBLIC_RESERVATION_NOT_FOUND", "Reserva não encontrada ou link inválido.");
    return `/public/reservations/${encodeURIComponent(token)}`;
  }
  async lookup(token: string, signal?: AbortSignal) {
    return decode(detailsSchema, await this.client.request(this.tokenPath(token), { ...publicOptions, signal }));
  }
  async cancel(token: string) {
    return decode(detailsSchema, await this.client.request(`${this.tokenPath(token)}/cancel`, { ...publicOptions, method: "POST" }));
  }
}
