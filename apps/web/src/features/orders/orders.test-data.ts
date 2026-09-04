import type { OrderDetail } from "./orders-service";

export const restaurantA = "11111111-1111-4111-8111-111111111111";
export const restaurantB = "22222222-2222-4222-8222-222222222222";
export const orderId = "33333333-3333-4333-8333-333333333333";
export const deliveryId = "44444444-4444-4444-8444-444444444444";
export const createdAt = "2026-09-03T12:00:00.000Z";

export function orderDetail(): OrderDetail {
  return {
    order: {
      id: orderId, restaurantId: restaurantA, customerId: restaurantB, tableId: null,
      type: "PICKUP", status: "PENDING", paymentStatus: "PENDING", subtotal: 5500, deliveryFee: 0, total: 5500,
      customerName: "Ana Silva", customerPhone: "11912345678",
      deliveryStreet: null, deliveryNumber: null, deliveryComplement: null, deliveryNeighborhood: null,
      deliveryCity: null, deliveryState: null, deliveryZipCode: null, observation: "Sem cebola",
      createdAt, updatedAt: createdAt,
    },
    items: [{
      id: restaurantA, orderId, productId: restaurantB, productName: "Margherita histórica",
      unitPrice: 5000, quantity: 1, subtotal: 5000, createdAt, addons: [],
    }],
    history: [{ id: restaurantA, action: "CREATED", previousStatus: null, newStatus: "PENDING", observation: null, createdAt }],
    delivery: null,
  };
}

export function deliveryDetail(): OrderDetail {
  const detail = orderDetail();
  detail.order = { ...detail.order, type: "DELIVERY", status: "PREPARING", deliveryStreet: "Rua das Pizzas", deliveryNumber: "10", deliveryNeighborhood: "Centro", deliveryCity: "São Paulo", deliveryState: "SP", deliveryZipCode: "01000000", deliveryFee: 500, total: 6000 };
  return detail;
}
