"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { InstallButton } from "@/components/InstallButton";
import { Brand } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemePicker } from "@/components/ThemePicker";
import { iconBtn } from "@/components/ui";

export function DeliveryHeader({ name }: { name: string }) {
  const onAccount = usePathname().startsWith("/delivery/account");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/delivery" className="min-w-0">
          <Brand sub={`${name}, delivery`} />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {/* Room for this only on wider screens; phones get it on the account page. */}
          <div className="hidden sm:block">
            <InstallButton />
          </div>
          <NotificationBell endpoint="/api/notifications" href="/delivery" />
          <ThemePicker />
          <Link
            href="/delivery/account"
            aria-label="My account"
            aria-current={onAccount ? "page" : undefined}
            className={`${iconBtn} ${onAccount ? "border-brand-300 bg-brand-50 text-brand-700" : ""}`}
          >
            <UserRound className="h-[18px] w-[18px]" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
