import type { Member } from "./team-service";

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function MembersList({ members, busy, onRole, onActive }: {
  members: Member[];
  busy: boolean;
  onRole: (member: Member) => void;
  onActive: (member: Member) => void;
}) {
  return <table className="team-table" aria-label="Membros do restaurante">
    <thead><tr><th>E-mail</th><th>Perfil</th><th>Status</th><th>Desde</th><th>Ações</th></tr></thead>
    <tbody>{members.map((member) => <tr key={member.id}>
      <th scope="row">{member.user.email}</th>
      <td data-label="Perfil">{member.role === "OWNER" ? "Proprietário" : "Equipe"}</td>
      <td data-label="Status"><span className={`team-status ${member.active ? "active" : "inactive"}`}>{member.active ? "Ativo" : "Inativo"}</span></td>
      <td data-label="Desde">{dateTime.format(new Date(member.createdAt))}</td>
      <td><div className="team-row-actions">
        <button className="secondary" disabled={busy} onClick={() => onRole(member)}>{member.role === "OWNER" ? "Tornar STAFF" : "Tornar OWNER"}</button>
        <button className="secondary" disabled={busy} onClick={() => onActive(member)}>{member.active ? "Desativar acesso" : "Ativar acesso"}</button>
      </div></td>
    </tr>)}</tbody>
  </table>;
}