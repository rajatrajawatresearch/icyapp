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

/** How long a customer's link stays open after their order is finished, until the owner chooses. */
export const DEFAULT_LINK_CLOSE_SEC = 120;

/** The choices offered in Settings (seconds; null = the link never closes). */
export const LINK_CLOSE_CHOICES: { value: number | null; label: string }[] = [
  { value: 0, label: "At once" },
  { value: 30, label: "After 30 seconds" },
  { value: 60, label: "After 1 minute" },
  { value: 120, label: "After 2 minutes" },
  { value: 300, label: "After 5 minutes" },
  { value: 600, label: "After 10 minutes" },
  { value: 1800, label: "After 30 minutes" },
  { value: 3600, label: "After 1 hour" },
  { value: null, label: "Never (the link stays open)" },
];

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
