import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api-client";
import { emptyOperatingWeek, operatingHoursSchema, weekdayLabels, type OperatingDay } from "../../lib/operating-hours";
import type { RestaurantSettingsService } from "./restaurant-settings-service";
import "./operating-hours.css";

export function OperatingHoursForm({ restaurantId, service }: { restaurantId: string; service: RestaurantSettingsService }) {
  const [days, setDays] = useState<OperatingDay[]>(emptyOperatingWeek);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string }>();
  const pending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setNotice(undefined);
    service.getOperatingHours(restaurantId, controller.signal).then(result => {
      if (!controller.signal.aborted) { setDays(result.days); setConfigured(result.configured); setLoading(false); }
    }).catch(error => {
      if (!controller.signal.aborted) { setNotice({ error: true, text: error instanceof ApiError ? error.message : "Não foi possível carregar os horários." }); setLoading(false); }
    });
    return () => controller.abort();
  }, [restaurantId, service]);

  function toggle(index: number, active: boolean) {
    setNotice(undefined);
    setDays(current => current.map((day, position) => position !== index ? day : active
      ? { dayOfWeek: day.dayOfWeek, active: true, opensAt: "09:00", closesAt: "18:00" }
      : { dayOfWeek: day.dayOfWeek, active: false, opensAt: null, closesAt: null }));
  }

  function changeTime(index: number, field: "opensAt" | "closesAt", value: string) {
    setNotice(undefined);
    setDays(current => current.map((day, position) => position === index && day.active ? { ...day, [field]: value } : day));
  }

  async function save() {
    if (pending.current) return;
    const parsed = operatingHoursSchema.safeParse({ configured: true, days });
    if (!parsed.success || parsed.data.days.some(day => day.active && day.opensAt >= day.closesAt)) {
      setNotice({ error: true, text: "Revise os horários: a abertura deve ser anterior ao fechamento." }); return;
    }
    pending.current = true; setBusy(true); setNotice(undefined);
    try {
      const updated = await service.updateOperatingHours(restaurantId, parsed.data.days);
      setDays(updated.days); setConfigured(updated.configured); setNotice({ error: false, text: "Horários de funcionamento atualizados." });
    } catch (error) {
      setNotice({ error: true, text: error instanceof ApiError ? `${error.message} (${error.code})` : "Não foi possível atualizar os horários." });
    } finally { pending.current = false; setBusy(false); }
  }

  return <section className="operating-hours-settings" aria-labelledby="operating-hours-title">
    <div><h2 id="operating-hours-title">Horários de funcionamento</h2><p className="settings-help">Horários locais do restaurante. Dias desativados ficam fechados; não são permitidos períodos atravessando a meia-noite.</p>{!configured && <p className="settings-help">Ainda sem configuração: os fluxos públicos permanecem disponíveis por compatibilidade até o primeiro salvamento.</p>}</div>
    {loading ? <p role="status">Carregando horários…</p> : <div className="operating-hours-week">{days.map((day, index) => <div className="operating-hours-day" key={day.dayOfWeek}>
      <label className="settings-checkbox"><input type="checkbox" checked={day.active} onChange={event => toggle(index, event.target.checked)} />{weekdayLabels[day.dayOfWeek]}</label>
      {day.active ? <div className="operating-hours-times"><label>Abre<input aria-label={`${weekdayLabels[day.dayOfWeek]} abre`} type="time" value={day.opensAt} onChange={event => changeTime(index, "opensAt", event.target.value)} /></label><label>Fecha<input aria-label={`${weekdayLabels[day.dayOfWeek]} fecha`} type="time" value={day.closesAt} onChange={event => changeTime(index, "closesAt", event.target.value)} /></label></div> : <span>Fechado</span>}
    </div>)}</div>}
    {notice && <p className={notice.error ? "error" : "settings-success"} role={notice.error ? "alert" : "status"}>{notice.text}</p>}
    {!loading && <button className="primary" disabled={busy} onClick={() => void save()}>{busy ? "Salvando horários…" : "Salvar horários"}</button>}
  </section>;
}
