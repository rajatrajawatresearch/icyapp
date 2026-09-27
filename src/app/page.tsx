import Link from "next/link";
import { btnPrimary } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sky-600 text-2xl text-white">
        🛒
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">Mini Marketplace</h1>
      <p className="mt-2 text-sm text-gray-600">
        Customers: open the private link your store shared with you. Store staff
        can sign in below.
      </p>
      <Link href="/admin/login" className={`${btnPrimary} mt-8 w-full py-3`}>
        Admin sign in
      </Link>
    </main>
  );
}
