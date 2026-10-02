import { prisma } from "@/lib/db";
import type { SessionAdmin } from "@/lib/auth";
import { AccessLink } from "./AccessLink";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { card } from "./ui";

const ROLE_LABEL = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  DELIVERY: "Delivery partner",
} as const;

/** "My account": who I am, my sign-in link, my password. Shared by staff and riders. */
export async function AccountPanel({ me }: { me: SessionAdmin }) {
  const account = await prisma.admin.findUniqueOrThrow({
    where: { id: me.id },
    select: { accessTokenHash: true, accessTokenAt: true },
  });
  const linkAt = account.accessTokenHash
    ? (account.accessTokenAt?.toISOString() ?? null)
    : null;

  return (
    <>
      <div className={`${card} mt-5 p-4`}>
        <p className="text-lg font-extrabold tracking-tight text-ink">{me.name}</p>
        <p className="text-sm text-ink-2">{me.email}</p>
        <p className="mt-1 text-xs font-semibold text-ink-3">{ROLE_LABEL[me.role]}</p>
      </div>

      <section className={`${card} mt-4 space-y-3 p-4`}>
        <div>
          <h2 className="font-bold text-ink">Sign-in link</h2>
          <p className="mt-0.5 text-sm text-ink-3">
            A private link that signs you in without a password. Save it on
            your phone; make a new one if it ever gets shared by mistake.
          </p>
        </div>
        <AccessLink endpoint="/api/auth/access-link" linkAt={linkAt} who="your" />
      </section>

      <ChangePasswordForm />
    </>
  );
}
