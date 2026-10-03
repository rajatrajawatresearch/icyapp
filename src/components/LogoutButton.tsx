"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { disablePush } from "@/lib/push-client";
import { confirmDialog } from "./ConfirmDialog";
import { btnSecondary, iconBtn } from "./ui";

/**
 * Signs out, and stops this device getting the account's push notifications.
 * `icon` is the small square version that sits with the bell and the theme
 * button; it asks first, because it is easy to tap by mistake up there.
 */
export function LogoutButton({
  className = "",
  icon = false,
}: {
  className?: string;
  icon?: boolean;
}) {
  const router = useRouter();

  async function logout() {
    if (
      icon &&
      !(await confirmDialog({
        title: `Log out of ${APP_NAME}?`,
        confirm: "Log out",
      }))
    )
      return;
    await disablePush();
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  if (icon) {
    return (
      <button
        type="button"
        aria-label="Log out"
        title="Log out"
        onClick={logout}
        className={`${iconBtn} ${className}`}
      >
        <LogOut className="h-[18px] w-[18px]" aria-hidden />
      </button>
    );
  }
  return (
    <button type="button" onClick={logout} className={`${btnSecondary} ${className}`}>
      <LogOut className="h-4 w-4" aria-hidden />
      Log out
    </button>
  );
}
