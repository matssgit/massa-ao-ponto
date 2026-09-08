import type { OrderItem } from "../orders/repositories/order-items-repository.js";
import type { Order } from "../orders/repositories/orders-repository.js";

export function publicOrderView(order: Order, orderItems: OrderItem[]) {
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
    },
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
