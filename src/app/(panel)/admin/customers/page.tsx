import type { Metadata } from "next";
import { isSuperAdmin, requireAdminPage } from "@/lib/auth";
import { CustomersClient } from "./CustomersClient";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const admin = await requireAdminPage();
  return <CustomersClient isSuper={isSuperAdmin(admin)} />;
}
