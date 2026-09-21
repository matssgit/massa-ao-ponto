import { z } from "zod";
import { ApiClient, ApiError } from "../../lib/api-client";

export const eventLabels = {
  RESERVATION_CREATED: "Reserva recebida", RESERVATION_REMINDER: "Lembrete de reserva",
  ORDER_CREATED: "Pedido recebido", ORDER_CONFIRMED: "Pedido confirmado",
  ORDER_READY: "Pronto para retirada", ORDER_OUT_FOR_DELIVERY: "Saiu para entrega",
};
export const statusLabels = { PENDING: "Pendente", SENT: "Enviada", FAILED: "Falhou" };
const notificationSchema = z.object({
  id: z.uuid(), type: z.enum(Object.keys(eventLabels) as [keyof typeof eventLabels, ...(keyof typeof eventLabels)[]]),
  resourceType: z.enum(["ORDER", "RESERVATION"]), resourceId: z.uuid(),
  status: z.enum(["PENDING", "SENT", "FAILED"]), attempts: z.number().int().positive(),
  createdAt: z.iso.datetime({ offset: true }), lastAttemptAt: z.iso.datetime({ offset: true }),
  errorSummary: z.string().nullable(),
}).strict();
const pageSchema = z.object({
  data: z.array(notificationSchema),
  meta: z.object({
    page: z.number().int().positive(), limit: z.number().int().positive(),
    total: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
    hasNext: z.boolean(), hasPrevious: z.boolean(),
  }).strict(),
}).strict();
export type NotificationsPageData = z.infer<typeof pageSchema>;
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(200, "INVALID_RESPONSE", "A API retornou notificações em formato inesperado.");
  return result.data;
}
export class NotificationsService {
  constructor(private readonly client: ApiClient) {}
  async list(restaurantId: string, page: number, status: string, type: string, signal: AbortSignal) {
    const query = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) query.set("status", status);
    if (type) query.set("type", type);
    return parse(pageSchema, await this.client.request(`/restaurants/${encodeURIComponent(restaurantId)}/notifications?${query}`, { signal }));
  }
  async retry(restaurantId: string, id: string, signal: AbortSignal) {
    return parse(notificationSchema, await this.client.request(
      `/restaurants/${encodeURIComponent(restaurantId)}/notifications/${encodeURIComponent(id)}/retry`,
      { method: "POST", signal },
    ));
  }
}
