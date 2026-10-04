import { redirect } from "next/navigation";
import { homePathFor, requireAdminPage } from "@/lib/auth";

/** /admin: each person's first section. */
export default async function AdminIndex() {
  redirect(homePathFor(await requireAdminPage()));
}
