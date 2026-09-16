import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../../lib/api-client";
import { restaurantLocalDate } from "../../lib/operating-hours";
import type { AdminSpecialHour, RestaurantSettingsService, SpecialHourInput } from "./restaurant-settings-service";
import { specialHourInputSchema } from "./restaurant-settings-service";
import "./operating-hours.css";

const empty = { date: "", closed: true, opensAt: "09:00", closesAt: "18:00", label: "" };

export function SpecialHoursForm({ restaurantId, timezone, service }: { restaurantId: string; timezone: string; service: RestaurantSettingsService }) {
  const [items, setItems] = useState<AdminSpecialHour[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string }>();
  const pending = useRef(false);
  const today = useMemo(() => restaurantLocalDate(new Date(), timezone), [timezone]);
  const upcoming = items.filter(item => item.date >= today);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setNotice(undefined); setEditingId(undefined); setForm(empty);
    service.getSpecialHours(restaurantId, controller.signal).then(result => {
      if (!controller.signal.aborted) { setItems(result); setLoading(false); }
    }).catch(error => {
      if (!controller.signal.aborted) { setNotice({ error: true, text: error instanceof ApiError ? error.message : "Não foi possível carregar as datas especiais." }); setLoading(false); }
    });
    return () => controller.abort();
  }, [restaurantId, service]);

  function edit(item: AdminSpecialHour) {
    setEditingId(item.id);
    setForm({ date: item.date, closed: item.closed, opensAt: item.opensAt?.slice(0, 5) ?? "09:00", closesAt: item.closesAt?.slice(0, 5) ?? "18:00", label: item.label ?? "" });
    setNotice(undefined);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    const input: SpecialHourInput = { date: form.date, closed: form.closed, opensAt: form.closed ? null : form.opensAt, closesAt: form.closed ? null : form.closesAt, label: form.label.trim() || null };
    const parsed = specialHourInputSchema.safeParse(input);
    if (!parsed.success) { setNotice({ error: true, text: parsed.error.issues[0]?.message ?? "Revise a data especial." }); return; }
    pending.current = true; setBusy(true); setNotice(undefined);
    try {
      const saved = editingId ? await service.updateSpecialHour(restaurantId, editingId, parsed.data) : await service.createSpecialHour(restaurantId, parsed.data);
      setItems(current => [...current.filter(item => item.id !== saved.id), saved].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)));
      setEditingId(undefined); setForm(empty); setNotice({ error: false, text: editingId ? "Data especial atualizada." : "Data especial criada." });
    } catch (error) {
      setNotice({ error: true, text: error instanceof ApiError ? `${error.message} (${error.code})` : "Não foi possível salvar a data especial." });
    } finally { pending.current = false; setBusy(false); }
  }

  async function remove(id: string) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setNotice(undefined);
    try {
      await service.deleteSpecialHour(restaurantId, id);
      setItems(current => current.filter(item => item.id !== id));
      if (editingId === id) { setEditingId(undefined); setForm(empty); }
      setNotice({ error: false, text: "Data especial excluída." });
    } catch (error) {
      setNotice({ error: true, text: error instanceof ApiError ? `${error.message} (${error.code})` : "Não foi possível excluir a data especial." });
    } finally { pending.current = false; setBusy(false); }
  }

  return <section className="operating-hours-settings special-hours-settings" aria-labelledby="special-hours-title">
    <div><h2 id="special-hours-title">Datas especiais</h2><p className="settings-help">Exceções pontuais no fuso {timezone}. O override manual continua tendo prioridade.</p></div>
    {loading ? <p role="status">Carregando datas especiais…</p> : <>
      {upcoming.length === 0 ? <p>Nenhuma data especial futura cadastrada.</p> : <ul className="special-hours-list">{upcoming.map(item => <li key={item.id}><div><strong>{item.date}</strong>{item.label && <span>{item.label}</span>}<small>{item.closed ? "Fechado" : `${item.opensAt?.slice(0, 5)}–${item.closesAt?.slice(0, 5)}`}</small></div><div><button className="secondary" type="button" disabled={busy} onClick={() => edit(item)}>Editar</button><button className="secondary" type="button" disabled={busy} onClick={() => void remove(item.id)}>Excluir</button></div></li>)}</ul>}
      <form className="special-hours-form" onSubmit={event => void submit(event)}>
        <label>Data<input type="date" required value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} /></label>
        <label className="settings-checkbox"><input type="checkbox" checked={form.closed} onChange={event => setForm(current => ({ ...current, closed: event.target.checked }))} />Restaurante fechado</label>
        {!form.closed && <div className="operating-hours-times"><label>Abre<input type="time" required value={form.opensAt} onChange={event => setForm(current => ({ ...current, opensAt: event.target.value }))} /></label><label>Fecha<input type="time" required value={form.closesAt} onChange={event => setForm(current => ({ ...current, closesAt: event.target.value }))} /></label></div>}
        <label>Rótulo opcional<input maxLength={120} value={form.label} placeholder="Ex.: Natal" onChange={event => setForm(current => ({ ...current, label: event.target.value }))} /></label>
        <div className="special-hours-actions"><button className="primary" disabled={busy}>{busy ? "Salvando…" : editingId ? "Salvar alteração" : "Adicionar data"}</button>{editingId && <button className="secondary" type="button" disabled={busy} onClick={() => { setEditingId(undefined); setForm(empty); }}>Cancelar edição</button>}</div>
      </form>
    </>}
    {notice && <p className={notice.error ? "error" : "settings-success"} role={notice.error ? "alert" : "status"}>{notice.text}</p>}
  </section>;
}
