import { useState, type FormEvent } from "react";
import { z } from "zod";
import { restaurantSettingsInputSchema, type RestaurantDetails, type RestaurantSettingsInput } from "./restaurant-settings-service";
import { centsToInput, inputToCents } from "../catalog/catalog-money";

const timezoneSuggestions = ["America/Sao_Paulo", "America/Manaus", "America/Recife", "America/Fortaleza", "America/Cuiaba", "UTC"];

function issue(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Revise os campos informados.";
  return error instanceof Error ? error.message : "Revise os campos informados.";
}

export function RestaurantSettingsForm({ restaurant, busy, onSubmit }: { restaurant: RestaurantDetails; busy: boolean; onSubmit: (value: RestaurantSettingsInput) => Promise<boolean> }) {
  const [name, setName] = useState(restaurant.name);
  const [address, setAddress] = useState(restaurant.address);
  const [phone, setPhone] = useState(restaurant.phone);
  const [timezone, setTimezone] = useState(restaurant.timezone);
  const [deliveryEnabled, setDeliveryEnabled] = useState(restaurant.deliveryEnabled);
  const [deliveryFee, setDeliveryFee] = useState(centsToInput(restaurant.deliveryFeeCents));
  const [whatsappNotificationsEnabled, setWhatsappNotificationsEnabled] = useState(restaurant.whatsappNotificationsEnabled);
  const [operationalOverride, setOperationalOverride] = useState(restaurant.operationalOverride);
  const [error, setError] = useState<string | null>(null);
  const unchanged = name === restaurant.name && address === restaurant.address && phone === restaurant.phone && timezone === restaurant.timezone && deliveryEnabled === restaurant.deliveryEnabled && deliveryFee === centsToInput(restaurant.deliveryFeeCents) && whatsappNotificationsEnabled === restaurant.whatsappNotificationsEnabled && operationalOverride === restaurant.operationalOverride;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const value = restaurantSettingsInputSchema.parse({ name, address, phone, timezone, deliveryEnabled, deliveryFeeCents: inputToCents(deliveryFee), whatsappNotificationsEnabled, operationalOverride });
      const normalizedUnchanged = value.name === restaurant.name && value.address === restaurant.address && value.phone === restaurant.phone && value.timezone === restaurant.timezone && value.deliveryEnabled === restaurant.deliveryEnabled && value.deliveryFeeCents === restaurant.deliveryFeeCents && value.whatsappNotificationsEnabled === restaurant.whatsappNotificationsEnabled && value.operationalOverride === restaurant.operationalOverride;
      if (normalizedUnchanged) { setError(null); return; }
      setError(null); await onSubmit(value);
    } catch (cause) { setError(issue(cause)); }
  }

  return <form className="restaurant-settings-form" aria-label="Configurações do restaurante" onSubmit={(event) => void submit(event)}>
    <fieldset disabled={busy}><legend>Identificação</legend><label>Nome do restaurante<input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} /></label></fieldset>
    <fieldset disabled={busy}><legend>Contato e localização</legend>
      <label>Endereço<input required maxLength={255} value={address} onChange={(event) => setAddress(event.target.value)} /></label>
      <label>Telefone<input required maxLength={50} inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      <label>Timezone<input required maxLength={100} list="restaurant-timezones" spellCheck={false} value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label>
      <datalist id="restaurant-timezones">{timezoneSuggestions.map((value) => <option key={value} value={value} />)}</datalist>
      <p className="settings-help">O valor é enviado exatamente como informado. Use o identificador de timezone configurado para a operação.</p>
    </fieldset>
    <fieldset disabled={busy}><legend>Status operacional</legend>
      <label>Funcionamento atual<select value={operationalOverride} onChange={(event) => setOperationalOverride(event.target.value as RestaurantSettingsInput["operationalOverride"])}>
        <option value="DEFAULT">Seguir horários</option>
        <option value="OPEN">Abrir agora</option>
        <option value="CLOSED">Fechar agora</option>
      </select></label>
      <p className="settings-help" role="status">{operationalOverride === "OPEN" ? "Aberto manualmente." : operationalOverride === "CLOSED" ? "Fechado manualmente." : "Seguindo os horários semanais."}</p>
    </fieldset>
    <fieldset disabled={busy}><legend>Notificações</legend>
      <label className="settings-checkbox"><input type="checkbox" checked={whatsappNotificationsEnabled} onChange={(event) => setWhatsappNotificationsEnabled(event.target.checked)} />Enviar atualizações operacionais por WhatsApp</label>
      <p className="settings-help">Usa o telefone canônico informado pelo cliente. O provider atual é somente de desenvolvimento.</p>
    </fieldset>
    <fieldset disabled={busy}><legend>Entrega</legend>
      <label className="settings-checkbox"><input type="checkbox" checked={deliveryEnabled} onChange={(event) => setDeliveryEnabled(event.target.checked)} />Aceitar pedidos para entrega</label>
      <label>Taxa fixa de entrega (R$)<input inputMode="decimal" value={deliveryFee} onChange={(event) => setDeliveryFee(event.target.value)} /></label>
      <p className="settings-help">A taxa configurada é aplicada pelo servidor aos pedidos DELIVERY. Retirada continua sem taxa.</p>
    </fieldset>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="settings-actions"><button className="primary" type="submit" disabled={busy || unchanged}>{busy ? "Salvando…" : "Salvar alterações"}</button><span aria-live="polite">{unchanged ? "Nenhuma alteração para salvar." : "Alterações ainda não salvas."}</span></div>
  </form>;
}
