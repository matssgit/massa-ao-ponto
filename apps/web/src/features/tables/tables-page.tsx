import { useCallback, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router";
import { ApiError } from "../../lib/api-client";
import { useAuth } from "../auth/auth-state";
import { isOwner, useRestaurant } from "../auth/restaurant-state";
import { TableForm } from "./table-form";
import { TablesList } from "./tables-list";
import { TablesService, type CreateTableInput, type RestaurantTable, type UpdateTableInput } from "./tables-service";
import { useTablesQuery } from "./use-tables-query";
import "./tables.css";

function OwnerTables({ restaurantId }: { restaurantId: string }) {
  const { service: auth } = useAuth();
  const service = useMemo(() => new TablesService(auth.client), [auth.client]);
  const load = useCallback((signal: AbortSignal) => service.list(restaurantId, signal), [service, restaurantId]);
  const { state, reload } = useTablesQuery(restaurantId, load);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const pending = useRef(false);

  async function mutate(success: string, action: () => Promise<unknown>) {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setNotice(null);
    try { await action(); setNotice({ error: false, text: success }); reload(); return true; }
    catch (error) {
      setNotice({ error: true, text: error instanceof ApiError ? `${error.message} (${error.code})` : "Não foi possível salvar a mesa." });
      reload(); return false;
    } finally { pending.current = false; setBusy(false); }
  }

  async function save(value: CreateTableInput | UpdateTableInput) {
    const saved = editing
      ? await mutate("Mesa atualizada.", () => service.update(restaurantId, editing.id, value))
      : await mutate("Mesa criada.", () => service.create(restaurantId, value));
    if (saved) setEditing(null);
    return saved;
  }

  return <section className="tables-page">
    <header className="tables-heading"><div><p className="eyebrow">ADMINISTRAÇÃO DO SALÃO</p><h1>Mesas</h1><p>Cadastre a estrutura disponível e mantenha sua capacidade atualizada.</p></div><button className="secondary" onClick={reload}>Atualizar</button></header>
    {notice && <p className={notice.error ? "error" : "tables-success"} role={notice.error ? "alert" : "status"}>{notice.text}</p>}
    {state.status === "loading" && <p className="tables-feedback" role="status">Carregando mesas…</p>}
    {state.status === "error" && <div className="tables-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={reload}>Tentar carregar mesas novamente</button></div>}
    {state.status === "success" && <div className="tables-workspace"><div><p className="tables-ordering">Ordenação do restaurante: número e identificador.</p>
      {state.data.length === 0 ? <p className="tables-feedback" role="status">Nenhuma mesa cadastrada.</p> : <TablesList tables={state.data} busy={busy} onEdit={setEditing} onToggle={(table) => void mutate(table.active ? "Mesa desativada." : "Mesa ativada.", () => service.update(restaurantId, table.id, { active: !table.active }))} />}
    </div><div><TableForm key={editing?.id ?? "new-table"} item={editing ?? undefined} busy={busy} onCancel={editing ? () => setEditing(null) : undefined} onSubmit={save} /><p className="tables-help">Ativa ou inativa indica disponibilidade administrativa. Não representa ocupação em tempo real.</p></div></div>}
  </section>;
}

export function TablesPage() {
  const { restaurantId, membership } = useRestaurant();
  if (!restaurantId || !membership) return null;
  if (!isOwner(membership)) return <Navigate to="/" replace />;
  return <OwnerTables key={restaurantId} restaurantId={restaurantId} />;
}
