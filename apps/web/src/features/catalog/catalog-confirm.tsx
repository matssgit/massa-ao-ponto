export function CatalogConfirm({ name, busy, onConfirm, onCancel }: {
  name: string; busy: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return <div className="catalog-confirm" role="alertdialog" aria-label={`Confirmar exclusão de ${name}`}>
    <p>Excluir <strong>{name}</strong>? Esta ação não pode ser desfeita.</p>
    <button className="danger" disabled={busy} onClick={onConfirm} autoFocus>{busy ? "Excluindo…" : "Confirmar exclusão"}</button>
    <button className="secondary" disabled={busy} onClick={onCancel}>Manter item</button>
  </div>;
}
