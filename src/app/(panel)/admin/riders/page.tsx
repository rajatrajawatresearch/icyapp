import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { TeamClient } from "../../TeamClient";

export const metadata: Metadata = { title: "Delivery team" };

/** Admins can't manage accounts, but they can re-issue a rider's sign-in link. */
export default async function RidersPage() {
  const me = await requireAdminPage();
  return <TeamClient myId={me.id} scope="riders" />;
}
