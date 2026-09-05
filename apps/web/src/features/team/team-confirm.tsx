export function TeamConfirm({ title, detail, action, busy, onConfirm, onCancel }: {
  title: string;
  detail: string;
  action: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return <div className="team-confirm" role="alertdialog" aria-label={title}>
    <h3>{title}</h3>
    <p>{detail}</p>
    <div className="team-confirm-actions">
      <button className="danger" disabled={busy} onClick={onConfirm} autoFocus>{busy ? "Salvando…" : action}</button>
      <button className="secondary" disabled={busy} onClick={onCancel}>Voltar</button>
    </div>
  </div>;
}