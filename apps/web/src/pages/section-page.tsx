export function SectionPage({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <section className="section-page">
      <p className="eyebrow">SEU ESPAÇO DE GESTÃO</p>
      <h1>{title}</h1>
      <div className="empty-state">
        <span className="empty-mark" aria-hidden="true">
          —
        </span>
        <p className="tag">Em preparação</p>
        <h2>Um espaço para o próximo passo.</h2>
        <p>{detail}</p>
        <p className="muted">
          Nenhuma informação operacional é exibida nesta tela por enquanto.
        </p>
      </div>
    </section>
  );
}
