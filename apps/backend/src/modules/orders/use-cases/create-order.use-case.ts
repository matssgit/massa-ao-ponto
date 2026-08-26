import {
  CreateOrderItemAddonData,
  CreateOrderItemData,
} from "../repositories/order-items-repository.js";

import { AddonInactiveError } from "../errors/addon-inactive-error.js";
import { AddonNotFoundError } from "../../products/errors/addon-not-found-error.js";
import { AddonRestaurantMismatchError } from "../../products/errors/addon-restaurant-mismatch-error.js";
import { AddonsRepository } from "../../products/repositories/addons-repository.js";
import { CustomerNotFoundError } from "../../customers/errors/customer-not-found-error.js";
import { CustomersRepository } from "../../reservations/repositories/customers-repository.js";
import { DuplicateProductInOrderError } from "../errors/duplicate-product-in-order-error.js";
import { InvalidDeliveryFeeError } from "../errors/invalid-delivery-fee-error.js";
import { InvalidItemQuantityError } from "../errors/invalid-item-quantity-error.js";
import { InvalidOrderTypeError } from "../errors/invalid-order-type-error.js";
import { MissingDeliveryAddressError } from "../errors/missing-delivery-address-error.js";
import { OrderTransactionManager } from "../repositories/order-transaction-manager.js";
import { ProductAddonNotFoundError } from "../../products/errors/product-addon-not-found-error.js";
import { ProductAddonsRepository } from "../../products/repositories/product-addons-repository.js";
import { ProductInactiveError } from "../errors/product-inactive-error.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { ProductRestaurantMismatchError } from "../errors/product-restaurant-mismatch-error.js";
import { ProductsRepository } from "../../products/repositories/products-repository.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import { TableInactiveError } from "../../reservations/errors/table-inactive-error.js";
import { TableNotFoundError } from "../../reservations/errors/table-not-found-error.js";
import { TableOccupiedError } from "../errors/table-occupied-error.js";
import { TableRestaurantMismatchError } from "../../reservations/errors/table-restaurant-mismatch-error.js";

interface CreateOrderRequestItem {
  productId: string;
  quantity: number;
  addons?: {
    addonId: string;
    quantity: number;
  }[];
}

export interface CreateOrderRequest {
  restaurantId: string;
  customerId: string;
  type: "DELIVERY" | "PICKUP" | "DINE_IN";
  tableId?: string;
  items: CreateOrderRequestItem[];
  deliveryFee: number;
  deliveryAddress?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  observation?: string;
}

export class CreateOrderUseCase {
  constructor(
    private readonly restaurantsRepository: RestaurantsRepository,
    private readonly customersRepository: CustomersRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly addonsRepository: AddonsRepository,
    private readonly productAddonsRepository: ProductAddonsRepository,
    private readonly transactionManager: OrderTransactionManager,
  ) {}

  async execute(request: CreateOrderRequest) {
    if (request.type === "DINE_IN" && !request.tableId) {
      throw new InvalidOrderTypeError("Pedidos DINE_IN exigem uma mesa.");
    }
    if (request.type !== "DINE_IN" && request.tableId) {
      throw new InvalidOrderTypeError(
        "Apenas pedidos DINE_IN podem ser vinculados a uma mesa.",
      );
    }

    const restaurant = await this.restaurantsRepository.findById(
      request.restaurantId,
    );
    if (!restaurant) throw new RestaurantNotFoundError();

    const customer = await this.customersRepository.findById(
      request.customerId,
    );
    if (!customer) throw new CustomerNotFoundError();

    const productIds = request.items.map((i) => i.productId);
    const uniqueProductIds = new Set(productIds);
    if (uniqueProductIds.size !== productIds.length) {
      throw new DuplicateProductInOrderError();
    }

    const products = await Promise.all(
      productIds.map((id) => this.productsRepository.findById(id)),
    );

    let subtotal = 0;
    const itemsToCreate: Omit<CreateOrderItemData, "orderId">[] = [];

    for (let i = 0; i < request.items.length; i++) {
      const itemRequest = request.items[i];
      const product = products[i];

      if (!product) throw new ProductNotFoundError();
      if (!product.active) throw new ProductInactiveError();
      if (product.restaurantId !== request.restaurantId)
        throw new ProductRestaurantMismatchError();
      if (itemRequest.quantity <= 0) throw new InvalidItemQuantityError();

      let itemAddonsTotal = 0;
      const itemAddonsSnapshot: CreateOrderItemAddonData[] = [];

      if (itemRequest.addons && itemRequest.addons.length > 0) {
        for (const addonReq of itemRequest.addons) {
          if (addonReq.quantity <= 0) throw new InvalidItemQuantityError();

          const addon = await this.addonsRepository.findById(addonReq.addonId);
          if (!addon) throw new AddonNotFoundError();
          if (!addon.active) throw new AddonInactiveError();
          if (addon.restaurantId !== request.restaurantId)
            throw new AddonRestaurantMismatchError();

          const isAssociated = await this.productAddonsRepository.exists({
            productId: product.id,
            addonId: addon.id,
          });
          if (!isAssociated) throw new ProductAddonNotFoundError();

          const addonSubtotal = addon.price * addonReq.quantity;
          itemAddonsTotal += addonSubtotal;

          itemAddonsSnapshot.push({
            addonId: addon.id,
            addonName: addon.name,
            unitPrice: addon.price,
            quantity: addonReq.quantity,
            subtotal: addonSubtotal,
          });
        }
      }

      const itemSubtotal =
        product.price * itemRequest.quantity + itemAddonsTotal;
      subtotal += itemSubtotal;

      itemsToCreate.push({
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: itemRequest.quantity,
        subtotal: itemSubtotal,
        addons: itemAddonsSnapshot.length > 0 ? itemAddonsSnapshot : undefined,
      });
    }

    if (request.type === "PICKUP" || request.type === "DINE_IN") {
      if (request.deliveryFee !== 0) throw new InvalidDeliveryFeeError();
    } else {
      if (request.deliveryFee < 0) throw new InvalidDeliveryFeeError();
      if (!request.deliveryAddress) throw new MissingDeliveryAddressError();
    }

    const total = subtotal + request.deliveryFee;

    return await this.transactionManager.transaction(
      async ({
        ordersRepository,
        orderItemsRepository,
        orderHistoryRepository,
        tablesRepository,
      }) => {
        if (request.type === "DINE_IN" && request.tableId) {
          const table = await tablesRepository.findByIdForUpdate(
            request.tableId,
          );

          if (!table) throw new TableNotFoundError();
          if (table.restaurantId !== request.restaurantId)
            throw new TableRestaurantMismatchError();
          if (!table.active) throw new TableInactiveError();

          const activeOrder =
            await ordersRepository.findActiveDineInOrderByTableId(table.id);
          if (activeOrder) {
            throw new TableOccupiedError();
          }
        }

        const order = await ordersRepository.create({
          restaurantId: request.restaurantId,
          customerId: request.customerId,
          tableId: request.tableId ?? null,
          type: request.type,
          status: "PENDING",
          paymentStatus: "PENDING",
          subtotal,
          deliveryFee: request.deliveryFee,
          total,
          customerName: customer.name,
          customerPhone: customer.phone,
          deliveryStreet: request.deliveryAddress?.street ?? null,
          deliveryNumber: request.deliveryAddress?.number ?? null,
          deliveryComplement: request.deliveryAddress?.complement ?? null,
          deliveryNeighborhood: request.deliveryAddress?.neighborhood ?? null,
          deliveryCity: request.deliveryAddress?.city ?? null,
          deliveryState: request.deliveryAddress?.state ?? null,
          deliveryZipCode: request.deliveryAddress?.zipCode ?? null,
          observation: request.observation ?? null,
        });

        await orderItemsRepository.createMany(
          itemsToCreate.map((item) => ({ ...item, orderId: order.id })),
        );

        await orderHistoryRepository.create({
          orderId: order.id,
          action: "CREATED",
          previousStatus: null,
          newStatus: "PENDING",
          observation:
            request.type === "DINE_IN"
              ? "Pedido DINE_IN (Mesa) criado"
              : "Pedido criado",
        });

        return order;
      },
    );
  }
}
