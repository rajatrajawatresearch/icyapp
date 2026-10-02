import Link from "next/link";
import { Glacier } from "@/components/Glacier";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <Glacier
        headline="Ordering from the store? Open the link it sent you."
        className="flex-1 px-6 pt-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:p-12"
      >
        <p className="mt-3 max-w-sm text-base text-on-solid/80">
          Your personal link is your account. There is nothing to sign up for.
        </p>
        <Link
          href="/admin/login"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-on-solid px-5 py-3 text-sm font-bold text-brand-700 transition active:scale-[0.97]"
        >
          Staff sign in
        </Link>
      </Glacier>
    </main>
  );
}
