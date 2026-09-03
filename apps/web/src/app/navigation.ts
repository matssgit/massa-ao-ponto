export const navigation = [
  {
    path: "/",
    label: "Visão geral",
    detail: "Indicadores do restaurante no período selecionado.",
    ownerOnly: false,
  },
  {
    path: "/pedidos",
    label: "Pedidos",
    detail: "A gestão dos pedidos será disponibilizada em uma próxima etapa.",
    ownerOnly: false,
  },
  {
    path: "/reservas",
    label: "Reservas",
    detail: "A agenda de reservas será disponibilizada em uma próxima etapa.",
    ownerOnly: false,
  },
  {
    path: "/clientes",
    label: "Clientes",
    detail:
      "A consulta aos clientes será disponibilizada em uma próxima etapa.",
    ownerOnly: false,
  },
  {
    path: "/cardapio",
    label: "Cardápio",
    detail: "Os produtos, categorias e adicionais serão reunidos aqui.",
    ownerOnly: false,
  },
  {
    path: "/mesas",
    label: "Mesas",
    detail: "A consulta às mesas será disponibilizada em uma próxima etapa.",
    ownerOnly: false,
  },
  {
    path: "/relatorios",
    label: "Relatórios",
    detail:
      "Os relatórios da pizzaria serão disponibilizados em uma próxima etapa.",
    ownerOnly: true,
  },
  {
    path: "/configuracoes",
    label: "Configurações",
    detail:
      "As configurações administrativas serão disponibilizadas em uma próxima etapa.",
    ownerOnly: true,
  },
] as const;
