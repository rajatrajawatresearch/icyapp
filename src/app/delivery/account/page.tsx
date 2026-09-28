import type { Metadata } from "next";
import Link from "next/link";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export const metadata: Metadata = { title: "My account" };

export default function DeliveryAccountPage() {
  return (
    <div>
      <Link href="/delivery" className="text-sm font-medium text-brand-700">
        ← My deliveries
      </Link>
      <ChangePasswordForm />
    </div>
  );
}
