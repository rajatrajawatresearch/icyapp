import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { resolveCustomer } from "@/lib/customer";
import { orderInclude, toOrderDTO } from "@/lib/dto";

/** GET /api/customer/:token/orders — the customer's own orders (polled by /u/[token]/orders). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const customer = await resolveCustomer(token);
  if (!customer)
    return jsonError("This link is invalid or has been revoked", 404);

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id, scheduledDeleteAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: orderInclude,
  });
  return NextResponse.json({ orders: orders.map(toOrderDTO) });
}
