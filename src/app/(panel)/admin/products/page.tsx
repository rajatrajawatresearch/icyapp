import type { Metadata } from "next";
import { isSuperAdmin, requireAdminPage } from "@/lib/auth";
import { ProductsClient } from "./ProductsClient";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const admin = await requireAdminPage();
  return <ProductsClient isSuper={isSuperAdmin(admin)} />;
}
