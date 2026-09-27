import { requireAdminPage } from "@/lib/auth";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage({ superOnly: true });
  return children;
}
