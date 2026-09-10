import type { OrderItem } from "../orders/repositories/order-items-repository.js";
import type { Order } from "../orders/repositories/orders-repository.js";
import type { Delivery } from "../orders/repositories/deliveries-repository.js";

export function publicOrderView(order: Order, orderItems: OrderItem[], delivery: Delivery | null = null) {
  const items = [...orderItems].sort((left, right) => {
    const dateDiff = left.createdAt.getTime() - right.createdAt.getTime();
    return dateDiff || left.id.localeCompare(right.id);
  });

  return {
    order: {
      status: order.status,
      type: order.type,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      deliveryAddress: order.type === "DELIVERY" ? {
        street: order.deliveryStreet,
        number: order.deliveryNumber,
        complement: order.deliveryComplement,
        neighborhood: order.deliveryNeighborhood,
        city: order.deliveryCity,
        state: order.deliveryState,
        zipCode: order.deliveryZipCode,
      } : null,
    },
    delivery: delivery ? { status: delivery.status } : null,
    items: items.map((item) => ({
      productName: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
      addons: [...(item.addons ?? [])]
        .sort((left, right) => {
          const dateDiff = left.createdAt.getTime() - right.createdAt.getTime();
          return dateDiff || left.id.localeCompare(right.id);
        })
        .map((addon) => ({
          addonName: addon.addonName,
          unitPrice: addon.unitPrice,
          quantity: addon.quantity,
          subtotal: addon.subtotal,
        })),
    })),
  };
}
