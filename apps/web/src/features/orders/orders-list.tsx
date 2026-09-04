import type { OrdersList as ListResult } from "./orders-service";
import { dateTime, money, statusLabels, typeLabels } from "./order-labels";
import { Pagination } from "../../components/pagination";

export function OrdersList({ result, onSelect, onPage }: {
  result: ListResult;
  onSelect: (id: string) => void;
  onPage: (page: number) => void;
}) {
  const { data, meta } = result;
  return <>
    <p className="orders-count">{meta.total} pedidos encontrados · Mais recentes primeiro</p>
    {data.length === 0 ? <p role="status" className="orders-feedback">Nenhum pedido nesta página para os filtros aplicados.</p> :
      <table className="orders-table" aria-label="Pedidos do restaurante">
        <thead><tr><th>Cliente / pedido</th><th>Tipo</th><th>Status</th><th>Pagamento</th><th>Total</th><th>Criado em</th><th>Ações</th></tr></thead>
        <tbody>{data.map(({ order }) => <tr key={order.id}>
          <th scope="row"><strong>{order.customerName}</strong><span className="orders-id">#{order.id.slice(0, 8)}</span></th>
          <td data-label="Tipo">{typeLabels[order.type]}</td>
          <td data-label="Status"><span className={`order-status order-status-${order.status.toLowerCase()}`}>{statusLabels[order.status]}</span></td>
          <td data-label="Pagamento">{order.paymentStatus === "PAID" ? "Pago" : "A pagar"}</td>
          <td data-label="Total" className="order-money">{money(order.total)}</td>
          <td data-label="Criado em"><time dateTime={order.createdAt}>{dateTime(order.createdAt)}</time></td>
          <td><button className="secondary" onClick={() => onSelect(order.id)} aria-label={`Abrir pedido ${order.id.slice(0, 8)} de ${order.customerName}`}>Abrir pedido</button></td>
        </tr>)}</tbody>
      </table>}
    <Pagination meta={meta} onPage={onPage} className="orders-pagination" label="Paginação de pedidos" />
  </>;
}
