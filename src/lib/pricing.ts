// Delivery pricing rule, shared by the checkout (to preview the charge) and
// the server (which decides the amount actually charged). Client-safe.

export type DeliveryPricing = {
  /** Charge added to a delivery order. */
  fee: number;
  /** Items worth at least this much are delivered free (null = never free). */
  freeAbove: number | null;
};

export function deliveryFeeFor(
  pricing: DeliveryPricing,
  fulfilment: "DELIVERY" | "PICKUP",
  itemsTotal: number,
) {
  if (fulfilment !== "DELIVERY") return 0;
  if (pricing.freeAbove !== null && itemsTotal >= pricing.freeAbove) return 0;
  return pricing.fee;
}
