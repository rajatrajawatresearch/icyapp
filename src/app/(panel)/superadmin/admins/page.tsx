import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { AdminsClient } from "./AdminsClient";

export const metadata: Metadata = { title: "Admins" };

export default async function AdminsPage() {
  const me = await requireAdminPage({ superOnly: true });
  return <AdminsClient myId={me.id} />;
}
