export interface PaginationMeta {
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function Pagination({ meta, onPage, className, label }: {
  meta: PaginationMeta;
  onPage: (page: number) => void;
  className: string;
  label: string;
}) {
  return <nav className={className} aria-label={label}>
    <button className="secondary" disabled={!meta.hasPrevious} onClick={() => onPage(meta.page - 1)}>Anterior</button>
    <span>Página {meta.page} de {meta.totalPages} · {meta.limit} por página</span>
    <button className="secondary" disabled={!meta.hasNext} onClick={() => onPage(meta.page + 1)}>Próxima</button>
  </nav>;
}
