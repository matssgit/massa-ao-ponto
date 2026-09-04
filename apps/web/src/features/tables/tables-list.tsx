import type { RestaurantTable } from "./tables-service";
export function TablesList({ tables, busy, onEdit, onToggle }: { tables: RestaurantTable[]; busy: boolean; onEdit: (table: RestaurantTable) => void; onToggle: (table: RestaurantTable) => void }) {
  return <table className="tables-list" aria-label="Mesas do restaurante"><thead><tr><th>Número</th><th>Capacidade</th><th>Tipo</th><th>Status</th><th>Ações</th></tr></thead><tbody>{tables.map((table) => <tr key={table.id}>
    <th scope="row">{table.number}</th><td data-label="Capacidade">{table.capacity} pessoas</td><td data-label="Tipo">{table.type === "room" ? "Sala" : "Mesa"}</td><td data-label="Status"><span className={table.active ? "table-status active" : "table-status"}>{table.active ? "Ativa" : "Inativa"}</span></td>
    <td><div className="table-row-actions"><button className="secondary" disabled={busy} onClick={() => onEdit(table)}>Editar</button><button className="secondary" disabled={busy} onClick={() => onToggle(table)}>{table.active ? "Desativar" : "Ativar"}</button></div></td>
  </tr>)}</tbody></table>;
}
