import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router";
import { ApiError } from "../../lib/api-client";
import { useAuth } from "../auth/auth-state";
import { isOwner, useRestaurant } from "../auth/restaurant-state";
import { RestaurantSettingsForm } from "./restaurant-settings-form";
import { RestaurantSettingsService, type RestaurantSettingsChanges, type RestaurantSettingsInput } from "./restaurant-settings-service";
import { useRestaurantSettingsQuery } from "./use-restaurant-settings-query";
import "./restaurant-settings.css";

function OwnerRestaurantSettings({ restaurantId }: { restaurantId: string }) {
  const { service: auth } = useAuth();
  const { updateRestaurantName } = useRestaurant();
  const service = useMemo(() => new RestaurantSettingsService(auth.client), [auth.client]);
  const load = useCallback((signal: AbortSignal) => service.get(restaurantId, signal), [service, restaurantId]);
  const { state, reload, setData } = useRestaurantSettingsQuery(restaurantId, load);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const pending = useRef(false);
  const active = useRef(true);
  useEffect(() => () => { active.current = false; }, []);

  async function save(value: RestaurantSettingsInput) {
    if (pending.current || state.status !== "success") return false;
    const changes: RestaurantSettingsChanges = {};
    if (value.name !== state.data.name) changes.name = value.name;
    if (value.address !== state.data.address) changes.address = value.address;
    if (value.phone !== state.data.phone) changes.phone = value.phone;
    if (value.timezone !== state.data.timezone) changes.timezone = value.timezone;
    if (Object.keys(changes).length === 0) return false;
    pending.current = true; setBusy(true); setNotice(null);
    try {
      const updated = await service.update(restaurantId, changes);
      if (!active.current) return false;
      setData(updated); updateRestaurantName(updated.id, updated.name);
      setNotice({ error: false, text: "Configurações atualizadas." }); return true;
    } catch (error) {
      if (active.current) setNotice({ error: true, text: error instanceof ApiError ? `${error.message} (${error.code})` : "Não foi possível atualizar o restaurante." });
      return false;
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  }

  return <section className="restaurant-settings-page"><header className="settings-heading"><div><p className="eyebrow">ADMINISTRAÇÃO DA CASA</p><h1>Configurações</h1><p>Mantenha os dados usados para identificar e operar este restaurante.</p></div>{state.status === "success" && <button className="secondary" onClick={() => { setNotice(null); reload(); }}>Recarregar</button>}</header>
    {notice && <p className={notice.error ? "error" : "settings-success"} role={notice.error ? "alert" : "status"}>{notice.text}</p>}
    {state.status === "loading" && <p className="settings-feedback" role="status">Carregando configurações…</p>}
    {state.status === "error" && <div className="settings-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={() => { setNotice(null); reload(); }}>Tentar carregar novamente</button></div>}
    {state.status === "success" && <RestaurantSettingsForm key={state.data.updatedAt} restaurant={state.data} busy={busy} onSubmit={save} />}
  </section>;
}

export function RestaurantSettingsPage() {
  const { restaurantId, membership } = useRestaurant();
  if (!restaurantId || !membership) return null;
  if (!isOwner(membership)) return <Navigate to="/" replace />;
  return <OwnerRestaurantSettings key={restaurantId} restaurantId={restaurantId} />;
}
