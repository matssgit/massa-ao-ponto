import { z } from "zod";
import { ApiClient, ApiError } from "../../lib/api-client";

const timestamp = z.iso.datetime({ offset: true });
export const tableSchema = z.object({
  id: z.uuid(), restaurantId: z.uuid(), number: z.string(),
  capacity: z.number().int().positive(), type: z.enum(["table", "room"]), active: z.boolean(),
  createdAt: timestamp, updatedAt: timestamp,
});
const tablesSchema = z.array(tableSchema);
const tableNumberSchema = z.string().trim().regex(/^\d+$/, "Informe um número inteiro positivo.")
  .transform(Number).pipe(z.number().safe().int().positive()).transform(String);
export const createTableInputSchema = z.object({
  number: tableNumberSchema,
  capacity: z.number().int().positive("A capacidade deve ser positiva."),
  type: z.enum(["table", "room"], { error: "Selecione um tipo válido." }),
});
export const updateTableInputSchema = createTableInputSchema.extend({ active: z.boolean() });
export type RestaurantTable = z.infer<typeof tableSchema>;
export type CreateTableInput = z.infer<typeof createTableInputSchema>;
export type UpdateTableInput = z.infer<typeof updateTableInputSchema>;

function parse<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(200, "INVALID_RESPONSE", `A API retornou ${label} em formato inesperado.`);
  return result.data;
}

export class TablesService {
  constructor(private readonly client: ApiClient) {}
  private root(restaurantId: string, tableId?: string) {
    const path = `/restaurants/${encodeURIComponent(restaurantId)}/tables`;
    return tableId ? `${path}/${encodeURIComponent(tableId)}` : path;
  }
  async list(restaurantId: string, signal?: AbortSignal) {
    return parse(tablesSchema, await this.client.request(this.root(restaurantId), { signal }), "as mesas");
  }
  async create(restaurantId: string, input: CreateTableInput) {
    return parse(tableSchema, await this.client.request(this.root(restaurantId), { method: "POST", body: input }), "uma mesa");
  }
  async update(restaurantId: string, tableId: string, input: Partial<UpdateTableInput>) {
    return parse(tableSchema, await this.client.request(this.root(restaurantId, tableId), { method: "PATCH", body: input }), "uma mesa");
  }
}
