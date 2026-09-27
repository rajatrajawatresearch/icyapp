import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { card, pageTitle } from "@/components/ui";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const admin = await requireAdminPage();
  return (
    <div className="max-w-md">
      <h1 className={pageTitle}>My account</h1>
      <div className={`${card} mt-4 p-4 text-sm`}>
        <p className="font-medium text-gray-900">{admin.name}</p>
        <p className="text-gray-600">{admin.email}</p>
        <p className="text-xs text-gray-500">
          {admin.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
