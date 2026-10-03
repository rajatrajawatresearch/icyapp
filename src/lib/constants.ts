// Shared between server and client code — keep free of server-only imports.

export const DELETE_DELAY_MINUTES = [1, 5, 10, 30] as const;
export const DEFAULT_DELETE_DELAY = 5;

export const TRASH_ENTITIES = ["product", "customer", "order"] as const;
export type TrashEntity = (typeof TRASH_ENTITIES)[number];

export const POLL_INTERVAL_MS = 6000;

/** Most units of one product in a single order (also the cap when stock isn't tracked). */
export const MAX_LINE_QTY = 999;

/** Payment screenshots a customer can attach to one order. */
export const MAX_PAYMENT_PROOFS = 6;

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
  OUT_FOR_DELIVERY: "On the way / ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_STYLE: Record<OrderStatusValue, string> = {
  PLACED: "bg-warning-soft text-warning-ink",
  CONFIRMED: "bg-brand-100 text-brand-800",
  PAID: "bg-success-soft text-success-ink",
  OUT_FOR_DELIVERY: "bg-info-soft text-info-ink",
  COMPLETED: "bg-muted text-ink-2",
  CANCELLED: "bg-danger-soft text-danger-ink",
};

/** How often open screens re-check their notifications. */
export const NOTIFICATION_POLL_MS = 12_000;
