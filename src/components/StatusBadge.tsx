import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  type OrderStatusValue,
} from "@/lib/constants";
import { pill } from "./ui";

export function StatusBadge({ status }: { status: OrderStatusValue }) {
  return (
    <span className={`${pill} ${ORDER_STATUS_STYLE[status]}`}>
      {ORDER_STATUS_LABEL[status]}
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
