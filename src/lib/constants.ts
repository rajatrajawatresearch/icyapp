// Shared between server and client code — keep free of server-only imports.

export const DELETE_DELAY_MINUTES = [1, 5, 10, 30] as const;
export const DEFAULT_DELETE_DELAY = 5;

export const TRASH_ENTITIES = ["product", "customer", "order"] as const;
export type TrashEntity = (typeof TRASH_ENTITIES)[number];

export const POLL_INTERVAL_MS = 6000;

export const ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PAID",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

/** Statuses an admin can pick from the dropdown (PAID is set via "Mark paid"). */
export const ADMIN_SETTABLE_STATUSES = [
  "CONFIRMED",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
] as const;

export const FINAL_STATUSES: readonly OrderStatusValue[] = [
  "COMPLETED",
  "CANCELLED",
];

export const ORDER_STATUS_LABEL: Record<OrderStatusValue, string> = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  PAID: "Paid",
  OUT_FOR_DELIVERY: "Out for delivery / ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_STYLE: Record<OrderStatusValue, string> = {
  PLACED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-sky-100 text-sky-800",
  PAID: "bg-emerald-100 text-emerald-800",
  OUT_FOR_DELIVERY: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-gray-200 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
};
