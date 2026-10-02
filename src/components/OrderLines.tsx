import type { OrderDTO } from "@/lib/dto";
import { inr } from "@/lib/format";

/** The priced lines of an order: items, the delivery charge, and the total to pay. */
export function OrderLines({
  order,
  className = "mt-4",
}: {
  order: Pick<OrderDTO, "items" | "fulfilmentType" | "deliveryFee" | "total">;
  className?: string;
}) {
  return (
    <ul className={`${className} space-y-1 text-sm text-ink`}>
      {order.items.map((i) => (
        <li key={i.id} className="flex justify-between gap-2">
          <span>
            {i.qty} × {i.productName}
          </span>
          <span className="text-ink-2 tabular-nums">
            {inr(i.qty * i.priceAtOrder)}
          </span>
        </li>
      ))}
      {order.fulfilmentType === "DELIVERY" && (
        <li className="flex justify-between gap-2">
          <span>Delivery charge</span>
          <span className="text-ink-2 tabular-nums">
            {order.deliveryFee > 0 ? inr(order.deliveryFee) : "Free"}
          </span>
        </li>
      )}
      <li className="flex justify-between border-t border-line pt-2 text-base font-extrabold">
        <span>Total</span>
        <span className="tabular-nums">{inr(order.total)}</span>
      </li>
    </ul>
  );
}
