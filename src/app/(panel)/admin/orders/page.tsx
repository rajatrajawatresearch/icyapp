import type { Metadata } from "next";
import { isSuperAdmin, requireAdminPage } from "@/lib/auth";
import { OrdersClient } from "./OrdersClient";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const admin = await requireAdminPage({ module: "orders" });
  return <OrdersClient isSuper={isSuperAdmin(admin)} />;
}
