import { z } from "zod";
import { ApiClient, ApiError } from "../../lib/api-client";

export const reservationStatusSchema = z.enum(["SCHEDULED", "CONFIRMED", "CANCELLED", "FINISHED", "NO_SHOW"]);
const timestamp = z.iso.datetime({ offset: true });
export const reservationSchema = z.object({
  id: z.uuid(), restaurantId: z.uuid(), tableId: z.uuid(), customerId: z.uuid(),
  status: reservationStatusSchema, people: z.number().int().positive(),
  startsAt: timestamp, endsAt: timestamp, observation: z.string().nullable(),
});
export const customerSchema = z.object({ id: z.uuid(), name: z.string(), phone: z.string(), email: z.string().nullable() });
export const tableSchema = z.object({
  id: z.uuid(), restaurantId: z.uuid(), number: z.string(), capacity: z.number().int().positive(),
  type: z.string(), active: z.boolean(), createdAt: timestamp, updatedAt: timestamp,
});
export const reservationHistorySchema = z.object({
  id: z.uuid(), reservationId: z.uuid(), action: z.string(), previousStatus: z.string().nullable(),
  newStatus: z.string(), observation: z.string().nullable(), createdAt: timestamp,
});
export const reservationListItemSchema = z.object({ reservation: reservationSchema, customer: customerSchema, table: tableSchema });
export const reservationsListSchema = z.object({
  data: z.array(reservationListItemSchema),
  meta: z.object({
    page: z.number().int().positive(), limit: z.number().int().min(1).max(100), total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(), hasNext: z.boolean(), hasPrevious: z.boolean(),
  }),
});
const reservationDetailsSchema = z.object({ reservation: reservationSchema, history: z.array(reservationHistorySchema) });
const availabilitySchema = z.array(tableSchema);

export type ReservationStatus = z.infer<typeof reservationStatusSchema>;
export type Reservation = z.infer<typeof reservationSchema>;
export type ReservationListItem = z.infer<typeof reservationListItemSchema>;
export type ReservationsList = z.infer<typeof reservationsListSchema>;
export type ReservationHistoryEntry = z.infer<typeof reservationHistorySchema>;
export type AvailableTable = z.infer<typeof tableSchema>;
export interface ReservationFiltersValue { status?: ReservationStatus; startsAt?: string; endsAt?: string; page: number; limit: number }
export type ReservationAction = { kind: "status"; status: ReservationStatus } | { kind: "cancel" };

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(200, "INVALID_RESPONSE", "A API retornou dados de reserva em formato inesperado.");
  return result.data;
}

export class ReservationsService {
  constructor(private readonly client: ApiClient) {}
  private root(restaurantId: string, reservationId?: string) {
    return `/restaurants/${encodeURIComponent(restaurantId)}/reservations${reservationId ? `/${encodeURIComponent(reservationId)}` : ""}`;
  }
  async list(restaurantId: string, filters: ReservationFiltersValue, signal?: AbortSignal) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== "") query.set(key, String(value));
    return parse(reservationsListSchema, await this.client.request(`${this.root(restaurantId)}?${query}`, { signal }));
  }
  async detail(restaurantId: string, reservationId: string, signal?: AbortSignal) {
    const root = this.root(restaurantId, reservationId);
    const [reservation, history] = await Promise.all([
      this.client.request(root, { signal }),
      this.client.request(`${root}/history`, { signal }),
    ]);
    return parse(reservationDetailsSchema, { reservation, history });
  }
  async availability(restaurantId: string, reservation: Reservation, signal?: AbortSignal) {
    const query = new URLSearchParams({ startsAt: reservation.startsAt, endsAt: reservation.endsAt, people: String(reservation.people) });
    return parse(availabilitySchema, await this.client.request(`/restaurants/${encodeURIComponent(restaurantId)}/availability?${query}`, { signal }));
  }
  async mutate(restaurantId: string, reservationId: string, action: ReservationAction) {
    const root = this.root(restaurantId, reservationId);
    const payload = action.kind === "cancel"
      ? await this.client.request(`${root}/cancel`, { method: "PATCH" })
      : await this.client.request(`${root}/status`, { method: "PATCH", body: { status: action.status } });
    return parse(reservationSchema, payload);
  }
}
