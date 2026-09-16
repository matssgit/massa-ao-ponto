import type { OrderNotificationContext, ReservationNotificationContext } from "./notification-types.js";

function reservationDate(context: ReservationNotificationContext) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: context.timezone,
  }).format(context.startsAt);
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function withLink(message: string, link?: string) {
  return link ? `${message} Acompanhe em ${link}` : message;
}

export const notificationTemplates = {
  reservationCreated(context: ReservationNotificationContext, link?: string) {
    return withLink(`Olá, ${context.customerName}! Sua reserva no ${context.restaurantName} para ${context.people} pessoa(s) foi recebida para ${reservationDate(context)}.`, link);
  },
  reservationReminder(context: ReservationNotificationContext, link?: string) {
    return withLink(`Olá, ${context.customerName}! Lembrete da sua reserva no ${context.restaurantName} em ${reservationDate(context)}.`, link);
  },
  orderCreated(context: OrderNotificationContext, link?: string) {
    const modality = context.type === "PICKUP" ? "retirada" : context.type === "DELIVERY" ? "entrega" : "consumo no salão";
    return withLink(`Olá, ${context.customerName}! Seu pedido para ${modality} no ${context.restaurantName} foi recebido. Total: ${money(context.total)}.`, link);
  },
  orderConfirmed(context: OrderNotificationContext, link?: string) {
    return withLink(`Seu pedido no ${context.restaurantName} foi confirmado.`, link);
  },
  orderReady(context: OrderNotificationContext, link?: string) {
    return withLink(`Seu pedido no ${context.restaurantName} está pronto para retirada.`, link);
  },
  orderOutForDelivery(context: OrderNotificationContext, link?: string) {
    return withLink(`Seu pedido no ${context.restaurantName} saiu para entrega.`, link);
  },
};
