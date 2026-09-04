import { Pagination } from "../../components/pagination";
import { customerEmail, formatCustomerPhone } from "./customer-labels";
import type { CustomersList as ListResult } from "./customers-service";

export function CustomersList({ result, search, onSelect, onPage }: {
  result: ListResult;
  search?: string;
  onSelect: (id: string) => void;
  onPage: (page: number) => void;
}) {
  const { data, meta } = result;
  return <>
    <p className="customers-count">{meta.total} clientes encontrados · Nome em ordem alfabética</p>
    {data.length === 0 ? <p className="customers-feedback" role="status">
      {search ? `Nenhum cliente encontrado para “${search}”.` : "Nenhum cliente relacionado a este restaurante."}
    </p> : <table className="customers-table" aria-label="Clientes do restaurante">
      <thead><tr><th>Cliente</th><th>Telefone</th><th>E-mail</th><th>Ações</th></tr></thead>
      <tbody>{data.map((customer) => <tr key={customer.id}>
        <th scope="row"><strong>{customer.name}</strong><span className="customer-id">#{customer.id.slice(0, 8)}</span></th>
        <td data-label="Telefone"><a href={`tel:${customer.phone}`}>{formatCustomerPhone(customer.phone)}</a></td>
        <td data-label="E-mail">{customer.email ? <a href={`mailto:${customer.email}`}>{customer.email}</a> : customerEmail(customer.email)}</td>
        <td><button className="secondary" onClick={() => onSelect(customer.id)} aria-label={`Abrir cliente ${customer.name}`}>Ver cliente</button></td>
      </tr>)}</tbody>
    </table>}
    <Pagination meta={meta} onPage={onPage} className="customers-pagination" label="Paginação de clientes" />
  </>;
}
