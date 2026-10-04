import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { isSuperAdmin, requireAdminPage } from "@/lib/auth";
import { purgeExpired } from "@/lib/purge";
import { formatDate, formatDateTime, inr } from "@/lib/format";
import { startOfStoreDay } from "@/lib/time";
import { SectionTabs } from "@/components/SectionTabs";
import { card, pageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Reports" };

const liveOrder = { scheduledDeleteAt: null };

async function paidTotal(method: "CASH" | "UPI", since?: Date) {
  const agg = await prisma.payment.aggregate({
    _sum: { amount: true },
    _count: true,
    where: {
      method,
      status: "PAID",
      order: liveOrder,
      ...(since && { confirmedAt: { gte: since } }),
    },
  });
  return { amount: Number(agg._sum.amount ?? 0), count: agg._count };
}

export default async function ReportsPage() {
  const admin = await requireAdminPage({ module: "reports" });
  await purgeExpired();
  const today = startOfStoreDay();
  const superView = isSuperAdmin(admin);

  const [
    ordersToday,
    cancelledToday,
    cashToday,
    upiToday,
    pendingUpi,
    recentPayments,
  ] = await Promise.all([
    prisma.order.count({ where: { ...liveOrder, createdAt: { gte: today } } }),
    prisma.order.count({
      where: { ...liveOrder, createdAt: { gte: today }, status: "CANCELLED" },
    }),
    paidTotal("CASH", today),
    paidTotal("UPI", today),
    prisma.payment.count({
      where: {
        method: "UPI",
        status: "PENDING",
        order: { ...liveOrder, status: { not: "CANCELLED" } },
      },
    }),
    prisma.payment.findMany({
      where: { status: "PAID", order: liveOrder },
      orderBy: { confirmedAt: "desc" },
      take: 20,
      include: {
        order: { select: { number: true, customerName: true } },
        confirmedBy: { select: { name: true } },
      },
    }),
  ]);

  const platform = superView
    ? await Promise.all([
        prisma.order.count({ where: liveOrder }),
        paidTotal("CASH"),
        paidTotal("UPI"),
        prisma.customer.count({ where: { scheduledDeleteAt: null } }),
      ])
    : null;

  const stats = [
    {
      label: "Today's orders",
      value: String(ordersToday),
      hint: cancelledToday ? `${cancelledToday} cancelled` : undefined,
    },
    {
      label: "Today's cash collected",
      value: inr(cashToday.amount),
      hint: `${cashToday.count} payments`,
    },
    {
      label: "Today's UPI collected",
      value: inr(upiToday.amount),
      hint: `${upiToday.count} payments`,
    },
    {
      label: "Pending UPI confirmations",
      value: String(pendingUpi),
      alert: pendingUpi > 0,
    },
  ];

  return (
    <div>
      {/* The audit log is the other half of this section, for the super admin only. */}
      {superView && <SectionTabs section="reports" />}
      <h1 className={pageTitle}>Reports</h1>
      <p className="text-sm text-ink-3">
        Today, {formatDate(today)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`${card} p-4 ${s.alert ? "border-warning-line bg-warning-soft" : ""}`}
          >
            <p className="text-xs font-medium text-ink-3">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
              {s.value}
            </p>
            {s.hint && <p className="text-xs text-ink-3">{s.hint}</p>}
          </div>
        ))}
      </div>

      {platform && (
        <>
          <h2 className="mt-8 text-base font-semibold text-ink">
            Platform totals (all time)
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Orders", value: String(platform[0]) },
              {
                label: "Revenue collected",
                value: inr(platform[1].amount + platform[2].amount),
              },
              {
                label: "Cash",
                value: inr(platform[1].amount),
                hint: `${platform[1].count} payments`,
              },
              {
                label: "UPI",
                value: inr(platform[2].amount),
                hint: `${platform[2].count} payments`,
              },
            ].map((s) => (
              <div key={s.label} className={`${card} p-4`}>
                <p className="text-xs font-medium text-ink-3">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                  {s.value}
                </p>
                {s.hint && <p className="text-xs text-ink-3">{s.hint}</p>}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-3">
            {platform[3]} active customers
          </p>
        </>
      )}

      <h2 className="mt-8 text-base font-semibold text-ink">
        Recent payments
      </h2>
      {recentPayments.length === 0 ? (
        <p className="mt-2 text-sm text-ink-3">No confirmed payments yet.</p>
      ) : (
        <div className={`${card} mt-3 overflow-x-auto`}>
          <table className="w-full text-left text-sm">
            <thead className="bg-subtle text-xs text-ink-3">
              <tr>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Confirmed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recentPayments.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 font-medium">#{p.order.number}</td>
                  <td className="px-3 py-2">{p.order.customerName}</td>
                  <td className="px-3 py-2">{p.method}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {inr(Number(p.amount))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-ink-2">
                    {p.confirmedAt ? formatDateTime(p.confirmedAt) : "—"}
                    {p.confirmedBy && `, ${p.confirmedBy.name}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
