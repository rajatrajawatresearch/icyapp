import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { customerAccess } from "@/lib/customer";
import { redirectToLinkHost } from "@/lib/device";
import { orderInclude, toOrderDTO } from "@/lib/dto";
import { getPickupLocation } from "@/lib/settings";
import { DeviceGate } from "../DeviceGate";
import { CustomerOrders } from "./CustomerOrders";

export const metadata: Metadata = {
  title: "My orders",
  referrer: "no-referrer",
};

export default async function CustomerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { token } = await params;
  const { placed } = await searchParams;
  await redirectToLinkHost(`/u/${token}/orders`);
  const access = await customerAccess(token);
  if (access.state === "invalid") notFound();
  if (access.state !== "ok")
    return <DeviceGate token={token} state={access.state} />;
  const { customer } = access;

  const [orders, pickup] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: customer.id, scheduledDeleteAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: orderInclude,
    }),
    getPickupLocation(),
  ]);

  return (
    <CustomerOrders
      token={token}
      initialOrders={orders.map(toOrderDTO)}
      placedNumber={placed ? Number(placed) : null}
      pickup={pickup}
    />
  );
}
