import { z } from "zod";
import { ApiClient, ApiError } from "../../lib/api-client";
import { operatingHoursSchema, type OperatingDay } from "../../lib/operating-hours";

const timestamp = z.iso.datetime({ offset: true });
export const restaurantSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  timezone: z.string(),
  deliveryEnabled: z.boolean(),
  deliveryFeeCents: z.number().int().nonnegative(),
  whatsappNotificationsEnabled: z.boolean(),
  operationalOverride: z.enum(["DEFAULT", "OPEN", "CLOSED"]),
  pixKey: z.string().nullable().default(null),
  pixRecipientName: z.string().nullable().default(null),
  createdAt: timestamp,
  updatedAt: timestamp,
});

const nullableTrimmed = (max: number, message: string) =>
  z.string().trim().max(max, message).transform((value) => value === "" ? null : value).nullable();

export const restaurantSettingsInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do restaurante.").max(255, "O nome deve ter no máximo 255 caracteres."),
  address: z.string().trim().min(1, "Informe o endereço.").max(255, "O endereço deve ter no máximo 255 caracteres."),
  phone: z.string().trim().min(1, "Informe o telefone.").max(50, "O telefone deve ter no máximo 50 caracteres."),
  timezone: z.string().trim().min(1, "Informe o timezone.").max(100, "O timezone deve ter no máximo 100 caracteres."),
  deliveryEnabled: z.boolean(),
  deliveryFeeCents: z.number().int().nonnegative(),
  whatsappNotificationsEnabled: z.boolean(),
  operationalOverride: z.enum(["DEFAULT", "OPEN", "CLOSED"]),
  pixKey: nullableTrimmed(255, "A chave Pix deve ter no máximo 255 caracteres.").default(null),
  pixRecipientName: nullableTrimmed(120, "O nome do favorecido deve ter no máximo 120 caracteres.").default(null),
}).superRefine((value, context) => {
  if ((value.pixKey === null) !== (value.pixRecipientName === null)) {
    context.addIssue({ code: "custom", path: ["pixKey"], message: "Informe a chave Pix e o nome do favorecido juntos." });
  }
});

export type RestaurantDetails = z.infer<typeof restaurantSchema>;
export type RestaurantSettingsInput = z.infer<typeof restaurantSettingsInputSchema>;
export type RestaurantSettingsChanges = Partial<RestaurantSettingsInput>;

export const adminSpecialHourSchema = z.object({
  id: z.uuid(),
  restaurantId: z.uuid(),
  date: z.iso.date(),
  closed: z.boolean(),
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  label: z.string().nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
}).strict();
export const specialHourInputSchema = z.object({
  date: z.iso.date("Informe uma data válida."),
  closed: z.boolean(),
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  label: z.string().trim().max(120, "O rótulo deve ter no máximo 120 caracteres.").nullable(),
}).superRefine((value, context) => {
  if (value.closed) {
    if (value.opensAt !== null || value.closesAt !== null) context.addIssue({ code: "custom", message: "Uma data fechada não possui horários." });
    return;
  }
  if (!value.opensAt || !value.closesAt) context.addIssue({ code: "custom", message: "Informe abertura e fechamento." });
  else if (value.opensAt >= value.closesAt) context.addIssue({ code: "custom", path: ["closesAt"], message: "A abertura deve ser anterior ao fechamento." });
});
export type AdminSpecialHour = z.infer<typeof adminSpecialHourSchema>;
export type SpecialHourInput = z.infer<typeof specialHourInputSchema>;

function parse(value: unknown): RestaurantDetails {
  const result = restaurantSchema.safeParse(value);
  if (!result.success) throw new ApiError(200, "INVALID_RESPONSE", "A API retornou o restaurante em formato inesperado.");
  return result.data;
}

function parseOperatingHours(value: unknown) {
  const result = operatingHoursSchema.safeParse(value);
  if (!result.success) throw new ApiError(200, "INVALID_RESPONSE", "A API retornou os horários em formato inesperado.");
  return result.data;
}

function parseSpecialHour(value: unknown) {
  const result = adminSpecialHourSchema.safeParse(value);
  if (!result.success) throw new ApiError(200, "INVALID_RESPONSE", "A API retornou a data especial em formato inesperado.");
  return result.data;
}

function parseSpecialHours(value: unknown) {
  const result = z.array(adminSpecialHourSchema).safeParse(value);
  if (!result.success) throw new ApiError(200, "INVALID_RESPONSE", "A API retornou as datas especiais em formato inesperado.");
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

  async getOperatingHours(restaurantId: string, signal?: AbortSignal) {
    return parseOperatingHours(await this.client.request(`${this.path(restaurantId)}/operating-hours`, { signal }));
  }
  async updateOperatingHours(restaurantId: string, days: OperatingDay[]) {
    return parseOperatingHours(await this.client.request(`${this.path(restaurantId)}/operating-hours`, { method: "PUT", body: { days } }));
  }
  async getSpecialHours(restaurantId: string, signal?: AbortSignal) {
    return parseSpecialHours(await this.client.request(`${this.path(restaurantId)}/special-hours`, { signal }));
  }
  async createSpecialHour(restaurantId: string, input: SpecialHourInput) {
    return parseSpecialHour(await this.client.request(`${this.path(restaurantId)}/special-hours`, { method: "POST", body: input }));
  }
  async updateSpecialHour(restaurantId: string, specialHourId: string, input: SpecialHourInput) {
    return parseSpecialHour(await this.client.request(`${this.path(restaurantId)}/special-hours/${encodeURIComponent(specialHourId)}`, { method: "PATCH", body: input }));
  }
  async deleteSpecialHour(restaurantId: string, specialHourId: string) {
    await this.client.request(`${this.path(restaurantId)}/special-hours/${encodeURIComponent(specialHourId)}`, { method: "DELETE" });
  }
}
