import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { customerAccess } from "@/lib/customer";
import { redirectToLinkHost } from "@/lib/device";
import { toProductDTO } from "@/lib/dto";
import { getDeliveryPricing, getPickupLocation } from "@/lib/settings";
import { DeviceGate } from "./DeviceGate";
import { Shop } from "./Shop";

export const metadata: Metadata = { title: "Shop", referrer: "no-referrer" };

export default async function CustomerShopPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  await redirectToLinkHost(`/u/${token}`);
  const access = await customerAccess(token);
  if (access.state === "invalid") notFound();
  if (access.state !== "ok")
    return <DeviceGate token={token} state={access.state} />;
  const { customer } = access;

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
