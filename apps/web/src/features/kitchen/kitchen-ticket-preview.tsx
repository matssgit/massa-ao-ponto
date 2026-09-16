import { useEffect, useRef } from "react";
import { dateTime, statusLabels } from "../orders/order-labels";
import type { KitchenOrder } from "./kitchen-service";

interface KitchenTicketPreviewProps {
  entry: KitchenOrder;
  restaurantName: string;
  tableNumber?: string;
  onClose: () => void;
}

function deliveryAddress(order: KitchenOrder["order"]): string {
  const street = [order.deliveryStreet, order.deliveryNumber].filter(Boolean).join(", ");
  const district = [order.deliveryNeighborhood, order.deliveryCity, order.deliveryState].filter(Boolean).join(" · ");
  return [street, order.deliveryComplement, district, order.deliveryZipCode].filter(Boolean).join(" — ");
}

function serviceLabel(entry: KitchenOrder, tableNumber?: string): string {
  if (entry.order.type === "PICKUP") return "RETIRADA";
  if (entry.order.type === "DELIVERY") return "ENTREGA";
  return tableNumber ? `MESA ${tableNumber}` : "MESA";
}

export function KitchenTicketPreview({ entry, restaurantName, tableNumber, onClose }: KitchenTicketPreviewProps) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const { order, items } = entry;

  useEffect(() => {
    closeButton.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return <div className="kitchen-print-backdrop">
    <section className="kitchen-print-dialog" role="dialog" aria-modal="true" aria-labelledby="kitchen-print-title">
      <div className="kitchen-print-actions">
        <button ref={closeButton} className="secondary" onClick={onClose}>Fechar prévia</button>
        <button className="primary" onClick={() => window.print()}>Imprimir</button>
      </div>
      <article className="kitchen-print-ticket">
        <header>
          <p>{restaurantName}</p>
          <h2 id="kitchen-print-title">Comanda #{order.id.slice(0, 8)}</h2>
          <time dateTime={order.createdAt}>{dateTime(order.createdAt)}</time>
        </header>
        <dl className="kitchen-print-meta">
          <div><dt>Modalidade</dt><dd>{serviceLabel(entry, tableNumber)}</dd></div>
          <div><dt>Cliente</dt><dd>{order.customerName}</dd></div>
          {order.type === "DELIVERY" && <div><dt>Endereço</dt><dd>{deliveryAddress(order)}</dd></div>}
          <div><dt>Status</dt><dd>{statusLabels[order.status]}</dd></div>
        </dl>
        <section className="kitchen-print-items" aria-labelledby="kitchen-print-items-title">
          <h3 id="kitchen-print-items-title">Itens</h3>
          <ol>{items.map((item) => <li key={item.id}>
            <strong>{item.quantity}× {item.productName}</strong>
            {item.addons.length > 0 && <ul>{item.addons.map((addon) => <li key={addon.id}>{addon.quantity}× {addon.addonName}</li>)}</ul>}
          </li>)}</ol>
        </section>
        {order.observation && <section className="kitchen-print-note" aria-labelledby="kitchen-print-note-title"><h3 id="kitchen-print-note-title">Observação</h3><p>{order.observation}</p></section>}
      </article>
    </section>
  </div>;
}
