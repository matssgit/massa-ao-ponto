import { useState, type FormEvent } from "react";
import { z } from "zod";
import { createTableInputSchema, updateTableInputSchema, type CreateTableInput, type RestaurantTable, type UpdateTableInput } from "./tables-service";
type TableFormValue = CreateTableInput | UpdateTableInput;
function issue(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Revise os campos informados.";
  return error instanceof Error ? error.message : "Revise os campos informados.";
}
export function TableForm({ item, busy, onCancel, onSubmit }: { item?: RestaurantTable; busy: boolean; onCancel?: () => void; onSubmit: (value: TableFormValue) => Promise<boolean> }) {
  const [number, setNumber] = useState(item?.number ?? ""); const [capacity, setCapacity] = useState(String(item?.capacity ?? 2));
  const [type, setType] = useState<"table" | "room">(item?.type ?? "table"); const [active, setActive] = useState(item?.active ?? true); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const draft = { number, capacity: Number(capacity), type, active };
      const value = item ? updateTableInputSchema.parse(draft) : createTableInputSchema.parse(draft);
      setError(null); const saved = await onSubmit(value);
      if (saved && !item) { setNumber(""); setCapacity("2"); setType("table"); }
    } catch (cause) { setError(issue(cause)); }
  }
  return <form className="table-form" aria-label={item ? `Editar mesa ${item.number}` : "Nova mesa"} onSubmit={(event) => void submit(event)}>
    <div><p className="eyebrow">{item ? "EDIÇÃO" : "CADASTRO"}</p><h2>{item ? `Mesa ${item.number}` : "Nova mesa"}</h2></div>
    <label>Número<input required inputMode="numeric" value={number} onChange={(event) => setNumber(event.target.value)} /></label>
    <label>Capacidade<input required type="number" min="1" step="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label>
    <label>Tipo<select value={type} onChange={(event) => setType(event.target.value as "table" | "room")}><option value="table">Mesa</option><option value="room">Sala</option></select></label>
    {item && <label className="table-active-field"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Disponível para operação</label>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="table-form-actions"><button className="primary" disabled={busy} type="submit">{busy ? "Salvando…" : item ? "Salvar alterações" : "Criar mesa"}</button>{onCancel && <button className="secondary" disabled={busy} type="button" onClick={onCancel}>Cancelar edição</button>}</div>
  </form>;
}
