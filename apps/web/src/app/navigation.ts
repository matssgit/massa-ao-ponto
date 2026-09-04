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
    detail: "Pedidos, preparo, pagamento e entrega do restaurante.",
    ownerOnly: false,
  },
  {
    path: "/reservas",
    label: "Reservas",
    detail: "Agenda, disponibilidade e operação das reservas.",
    ownerOnly: false,
  },
  {
    path: "/clientes",
    label: "Clientes",
    detail: "Consulta dos clientes relacionados ao restaurante.",
    ownerOnly: false,
  },
  {
    path: "/cardapio",
    label: "Cardápio",
    detail: "Produtos, categorias e adicionais do restaurante.",
    ownerOnly: true,
  },
  {
    path: "/mesas",
    label: "Mesas",
    detail: "Estrutura, capacidade e disponibilidade administrativa das mesas.",
    ownerOnly: true,
  },
  {
    path: "/configuracoes",
    label: "Configurações",
    detail: "Identificação, contato e timezone do restaurante.",
    ownerOnly: true,
  },
] as const;
