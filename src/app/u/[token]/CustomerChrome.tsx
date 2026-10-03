"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReceiptText, Store } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { PushPrompt } from "@/components/PushPrompt";
import { ThemePicker } from "@/components/ThemePicker";

const RENEW_EVERY_MS = 7 * 24 * 60 * 60 * 1000;

/** Top bar shared by the customer's shop and orders screens. */
export function CustomerHeader({
  token,
  title,
  subtitle,
  children,
}: {
  token: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  // The link is tied to this device by a cookie that browsers expire after
  // about a year. Renewing it now and then keeps a regular customer signed in.
  useEffect(() => {
    const key = `device-renewed:${token}`;
    try {
      if (Date.now() - Number(localStorage.getItem(key) ?? 0) < RENEW_EVERY_MS)
        return;
      fetch(`/api/customer/${token}/device`, { method: "POST" })
        .then((res) => res.ok && localStorage.setItem(key, String(Date.now())))
        .catch(() => {});
    } catch {
      // Storage blocked: the cookie simply isn't renewed this time.
    }
  }, [token]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 px-4 py-2.5 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Logo refresh />
            <div className="min-w-0">
              <h1 className="truncate text-[17px] leading-tight font-extrabold tracking-[-0.02em] text-ink">
                {title}
              </h1>
              {subtitle && <p className="truncate text-xs text-ink-3">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell
              endpoint={`/api/customer/${token}/notifications`}
              href={`/u/${token}/orders`}
              pushToken={token}
            />
            <ThemePicker />
          </div>
        </div>
        {children}
      </header>
      <PushPrompt audience="customer" token={token} className="mx-4 mt-4" />
    </>
  );
}

/** Bottom tab bar: Shop and Orders, like a native app. */
export function CustomerTabs({ token }: { token: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/u/${token}`, label: "Shop", Icon: Store },
    { href: `/u/${token}/orders`, label: "My orders", Icon: ReceiptText },
  ];
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-2">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                active ? "text-brand-700" : "text-ink-3"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
