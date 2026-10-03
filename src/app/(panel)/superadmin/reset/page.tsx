import { redirect } from "next/navigation";

/** Data reset moved into Settings; old links and bookmarks still land on it. */
export default function OldResetPage() {
  redirect("/superadmin/settings/reset");
}
