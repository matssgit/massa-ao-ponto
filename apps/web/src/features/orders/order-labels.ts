import type { OrderStatus, OrderType } from "./orders-service";

export const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Pendente", CONFIRMED: "Confirmado", PREPARING: "Em preparo",
  READY: "Pronto", OUT_FOR_DELIVERY: "Em entrega", DELIVERED: "Concluído", CANCELLED: "Cancelado",
};
export const typeLabels: Record<OrderType, string> = {
  DELIVERY: "Entrega", PICKUP: "Retirada", DINE_IN: "No salão",
};
export const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
export const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
