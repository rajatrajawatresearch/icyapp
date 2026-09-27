import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { resolveCustomer } from "@/lib/customer";
import { orderInclude, toOrderDTO } from "@/lib/dto";
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
  const customer = await resolveCustomer(token);
  if (!customer) notFound();

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id, scheduledDeleteAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: orderInclude,
  });

  return (
    <CustomerOrders
      token={token}
      initialOrders={orders.map(toOrderDTO)}
      placedNumber={placed ? Number(placed) : null}
    />
  );
}
