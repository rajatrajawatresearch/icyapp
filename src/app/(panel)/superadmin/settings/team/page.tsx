import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { TeamClient } from "../../../TeamClient";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireAdminPage({ superOnly: true });
  return <TeamClient myId={me.id} scope="all" />;
}
