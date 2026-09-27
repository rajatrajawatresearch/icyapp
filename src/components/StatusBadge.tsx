import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  type OrderStatusValue,
} from "@/lib/constants";

export function StatusBadge({ status }: { status: OrderStatusValue }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_STYLE[status]}`}
    >
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
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        paid
          ? "bg-emerald-100 text-emerald-800"
          : "bg-orange-100 text-orange-800"
      }`}
    >
      {method} · {paid ? "Paid" : "Pending"}
    </span>
  );
}
