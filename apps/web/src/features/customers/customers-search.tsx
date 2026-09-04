import { useState, type FormEvent } from "react";
import type { CustomerFilters } from "./customers-service";

export function CustomersSearch({ onApply }: { onApply: (filters: CustomerFilters) => void }) {
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(20);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = search.trim();
    onApply({ page: 1, limit, search: normalized || undefined });
  }

  function clear() {
    setSearch("");
    setLimit(20);
    onApply({ page: 1, limit: 20 });
  }

  return <form className="customers-search" aria-label="Busca de clientes" onSubmit={submit}>
    <label>Buscar cliente
      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, e-mail ou telefone" />
    </label>
    <label>Por página
      <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
        {[20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
    </label>
    <button className="primary" type="submit">Buscar</button>
    <button className="secondary" type="button" onClick={clear}>Limpar busca</button>
  </form>;
}
