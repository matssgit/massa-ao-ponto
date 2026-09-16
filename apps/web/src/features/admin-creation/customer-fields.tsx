export type CustomerDraft = { name: string; phone: string; email: string };

export function CustomerFields({ idPrefix, value, disabled, onChange }: {
  idPrefix: string;
  value: CustomerDraft;
  disabled?: boolean;
  onChange: (value: CustomerDraft) => void;
}) {
  return <fieldset disabled={disabled} className="admin-create-fields">
    <legend>Cliente</legend>
    <label htmlFor={`${idPrefix}-name`}>Nome<input id={`${idPrefix}-name`} required minLength={2} value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /></label>
    <label htmlFor={`${idPrefix}-phone`}>Telefone<input id={`${idPrefix}-phone`} required inputMode="tel" value={value.phone} onChange={(event) => onChange({ ...value, phone: event.target.value })} /></label>
    <label htmlFor={`${idPrefix}-email`}>E-mail (opcional)<input id={`${idPrefix}-email`} type="email" value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} /></label>
  </fieldset>;
}
