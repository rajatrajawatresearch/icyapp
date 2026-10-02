"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { disablePush } from "@/lib/push-client";
import { btnSecondary } from "./ui";

/** Signs out, and stops this device getting the account's push notifications. */
export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  async function logout() {
    await disablePush();
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} className={`${btnSecondary} ${className}`}>
      <LogOut className="h-4 w-4" aria-hidden />
      Log out
    </button>
  );
}
