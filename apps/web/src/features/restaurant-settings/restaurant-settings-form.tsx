import { useState, type FormEvent } from "react";
import { z } from "zod";
import { restaurantSettingsInputSchema, type RestaurantDetails, type RestaurantSettingsInput } from "./restaurant-settings-service";

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
  const [error, setError] = useState<string | null>(null);
  const unchanged = name === restaurant.name && address === restaurant.address && phone === restaurant.phone && timezone === restaurant.timezone;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const value = restaurantSettingsInputSchema.parse({ name, address, phone, timezone });
      const normalizedUnchanged = value.name === restaurant.name && value.address === restaurant.address && value.phone === restaurant.phone && value.timezone === restaurant.timezone;
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
    {error && <p className="error" role="alert">{error}</p>}
    <div className="settings-actions"><button className="primary" type="submit" disabled={busy || unchanged}>{busy ? "Salvando…" : "Salvar alterações"}</button><span aria-live="polite">{unchanged ? "Nenhuma alteração para salvar." : "Alterações ainda não salvas."}</span></div>
  </form>;
}
