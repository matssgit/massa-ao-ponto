import { useMemo } from "react";
import { DashboardSection, MetricCard, DashboardEmpty } from "./dashboard-section";
import { DashboardService } from "./dashboard-service";
import { formatCount, formatMoney, type DashboardPeriod } from "./period";
import { useDashboardSection } from "./use-dashboard-section";

export function DashboardReports({ service, restaurantId, period }: { service: DashboardService; restaurantId: string; period: DashboardPeriod }) {
  const loaders = useMemo(() => ({
    summary: (signal: AbortSignal) => service.summary(restaurantId, period, signal),
    products: (signal: AbortSignal) => service.products(restaurantId, period, signal),
    customers: (signal: AbortSignal) => service.customers(restaurantId, period, signal),
    categories: (signal: AbortSignal) => service.categories(restaurantId, period, signal),
  }), [service, restaurantId, period]);
  const summary = useDashboardSection(loaders.summary);
  const products = useDashboardSection(loaders.products);
  const customers = useDashboardSection(loaders.customers);
  const categories = useDashboardSection(loaders.categories);

  return <div className="dashboard-grid">
    <DashboardSection title="Resumo do período" description="Receita e ticket médio: pedidos pagos, sem cancelados." {...summary} className="dashboard-wide dashboard-summary">
      {(data) => <><dl className="metric-grid">
        <MetricCard label="Receita" value={formatMoney(data.revenue)} detail="Total dos pedidos pagos não cancelados" />
        <MetricCard label="Pedidos pagos" value={formatCount(data.orders.paid)} detail="Pagos e não cancelados" />
        <MetricCard label="Ticket médio" value={formatMoney(data.averageTicket)} detail="Por pedido pago não cancelado" />
        <MetricCard label="Total de pedidos" value={formatCount(data.orders.total)} detail="Inclui todos os status, inclusive cancelados" />
      </dl>{data.orders.total === 0 && <DashboardEmpty>Nenhum pedido criado neste período.</DashboardEmpty>}</>}
    </DashboardSection>
    <DashboardSection title="Principais produtos" description="Até 5 resultados por receita. Quantidades excluem cancelados, mas incluem não pagos." {...products}>
      {(data) => data.length === 0 ? <DashboardEmpty>Nenhum produto vendido neste período.</DashboardEmpty> : <ol className="dashboard-ranking">{data.map((product, index) => <li key={`${product.productId}:${product.productName}`}>
        <span className="rank-position" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <div className="rank-name"><strong>{product.productName}</strong><span>{formatCount(product.quantitySold)} unidades · {formatCount(product.orderCount)} pedidos</span></div>
        <div className="rank-money"><strong>{formatMoney(product.revenue)}</strong><span>Receita dos itens pagos</span></div>
      </li>)}</ol>}
    </DashboardSection>
    <DashboardSection title="Principais clientes" description="Até 5 resultados por valor gasto. Contagens excluem pedidos cancelados." {...customers}>
      {(data) => data.length === 0 ? <DashboardEmpty>Nenhum cliente com pedidos neste período.</DashboardEmpty> : <ol className="dashboard-ranking">{data.map((customer, index) => <li key={customer.customerId}>
        <span className="rank-position" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <div className="rank-name"><strong>{customer.customerName}</strong><span>{formatCount(customer.ordersCount)} pedidos · {formatCount(customer.paidOrdersCount)} pagos</span></div>
        <div className="rank-money"><strong>{formatMoney(customer.totalSpent)}</strong><span>Ticket pago {formatMoney(customer.averageTicket)}</span></div>
      </li>)}</ol>}
    </DashboardSection>
    <DashboardSection title="Desempenho por categoria" description="Até 5 categorias por receita dos itens pagos. Quantidades e pedidos incluem não pagos e excluem cancelados." {...categories} className="dashboard-wide">
      {(data) => <>{data.length === 0 ? <DashboardEmpty>Nenhuma categoria com vendas neste período.</DashboardEmpty> : <div className="dashboard-table-scroll" tabIndex={0} role="region" aria-label="Tabela de desempenho por categoria"><table className="dashboard-table"><thead><tr><th scope="col">Categoria</th><th scope="col">Unidades</th><th scope="col">Pedidos</th><th scope="col">Receita dos itens pagos</th></tr></thead><tbody>{data.map((category) => <tr key={category.categoryId}><th scope="row">{category.categoryName}</th><td>{formatCount(category.quantitySold)}</td><td>{formatCount(category.orderCount)}</td><td>{formatMoney(category.revenue)}</td></tr>)}</tbody></table></div>}
      <p className="dashboard-note">O relatório usa a categoria atual do produto. Mudar um produto de categoria reatribui suas vendas históricas. Receitas de itens não devem ser somadas para substituir a receita total dos pedidos.</p></>}
    </DashboardSection>
  </div>;
}
