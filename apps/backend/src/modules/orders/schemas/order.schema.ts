import { z } from "zod";

export const createOrderParamsSchema = z.object({
  restaurantId: z.string().uuid("Formato de ID do restaurante inválido."),
});

export const createOrderBodySchema = z.object({
  customerId: z.string().uuid("Formato de ID do cliente inválido."),
  type: z.enum(["DELIVERY", "PICKUP"]),
  items: z
    .array(
      z.object({
        productId: z.string().uuid("Formato de ID do produto inválido."),
        quantity: z
          .number()
          .int()
          .positive("A quantidade deve ser maior que zero."),
      }),
    )
    .min(1, "O pedido deve conter pelo menos um item."),
  deliveryFee: z.number().int().min(0).default(0),
  deliveryAddress: z
    .object({
      street: z.string().min(1),
      number: z.string().min(1),
      complement: z.string().optional(),
      neighborhood: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      zipCode: z.string().min(1),
    })

    .optional(),
  observation: z.string().optional(),
});

export const getOrderParamsSchema = z.object({
  orderId: z.string().uuid("Formato de ID do pedido inválido."),
});

export const listOrdersParamsSchema = z.object({
  restaurantId: z.string().uuid("Formato de ID do restaurante inválido."),
});

export const listOrdersQuerySchema = z.object({
  status: z
    .enum([
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ])
    .optional(),
  type: z.enum(["DELIVERY", "PICKUP"]).optional(),
  customerId: z.string().uuid("Formato de ID de cliente inválido").optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

export const updateOrderStatusParamsSchema = z.object({
  orderId: z.string().uuid("Formato de ID do pedido inválido."),
});

export const updateOrderStatusBodySchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]),
});

export const cancelOrderParamsSchema = z.object({
  orderId: z.string().uuid("Formato de ID do pedido inválido."),
});
