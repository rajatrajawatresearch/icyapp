import { redirect } from "next/navigation";

/** The team moved into Settings; old links and bookmarks still land on it. */
export default function OldTeamPage() {
  redirect("/superadmin/settings/team");
}
