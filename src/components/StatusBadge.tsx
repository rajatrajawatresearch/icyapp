import {
  ORDER_STATUS_STYLE,
  orderStatusLabel,
  type OrderStatusValue,
} from "@/lib/constants";
import { pill } from "./ui";

export function StatusBadge({
  status,
  fulfilment,
}: {
  status: OrderStatusValue;
  fulfilment?: "DELIVERY" | "PICKUP";
}) {
  return (
    <span className={`${pill} ${ORDER_STATUS_STYLE[status]}`}>
      {orderStatusLabel(status, fulfilment)}
    </span>
  );
}

export function PaymentBadge({
  method,
  status,
}: {
  method: "CASH" | "UPI";
  status: "PENDING" | "PAID";
}) {
  const paid = status === "PAID";
  return (
    <span
      className={`${pill} ${
        paid ? "bg-success-soft text-success-ink" : "bg-warning-soft text-warning-ink"
      }`}
    >
      {method === "CASH" ? "Cash" : "UPI"} {paid ? "paid" : "pending"}
    </span>
  );
}
