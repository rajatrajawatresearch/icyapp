import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionAdmin, homePathFor } from "@/lib/auth";
import { Glacier } from "@/components/Glacier";
import { ThemePicker } from "@/components/ThemePicker";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>;
}) {
  const admin = await getSessionAdmin();
  if (admin) redirect(homePathFor(admin.role));
  const { link } = await searchParams;

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col lg:grid lg:grid-cols-[1.1fr_1fr]">
      <div className="absolute top-4 right-4 z-10 lg:top-5 lg:right-5">
        <ThemePicker />
      </div>
      <Glacier
        headline="Every order, from the first tap to the doorstep."
        className="px-6 pt-6 pb-14 lg:p-12"
      >
        <p className="mt-3 hidden max-w-sm text-base text-on-solid/80 lg:block">
          Take orders, confirm payments and send out deliveries from one place.
        </p>
      </Glacier>

      {/* On phones the form rides up over the glacier like a sheet. */}
      <section className="relative -mt-8 flex flex-1 flex-col rounded-t-[2rem] bg-page px-6 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] lg:mt-0 lg:justify-center lg:rounded-none lg:px-12">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-[2rem] leading-tight font-extrabold tracking-[-0.035em] text-ink">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            For store staff and delivery partners.
          </p>
          <LoginForm linkInvalid={link === "invalid"} />
          <p className="mt-8 border-t border-line pt-5 text-sm text-ink-3">
            Ordering from the store? You don&apos;t need to sign in. Open the
            link the store sent you.
          </p>
        </div>
      </section>
    </main>
  );
}
