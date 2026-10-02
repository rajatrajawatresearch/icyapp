import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { resolveCustomer } from "@/lib/customer";
import { toProductDTO } from "@/lib/dto";
import { getDeliveryPricing, getPickupLocation } from "@/lib/settings";
import { Shop } from "./Shop";

export const metadata: Metadata = { title: "Shop", referrer: "no-referrer" };

export default async function CustomerShopPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const customer = await resolveCustomer(token);
  if (!customer) notFound();

  const [products, pickup, delivery] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, scheduledDeleteAt: null },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    getPickupLocation(),
    getDeliveryPricing(),
  ]);

  return (
    <Shop
      token={token}
      customerName={customer.name}
      products={products.map(toProductDTO)}
      pickup={pickup}
      delivery={delivery}
    />
  );
}
