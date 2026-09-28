import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionAdmin, homePathFor } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin sign in" };

export default async function LoginPage() {
  const admin = await getSessionAdmin();
  if (admin) redirect(homePathFor(admin.role));
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-gray-900">Admin sign in</h1>
      <p className="mt-1 text-sm text-gray-600">Mini Marketplace store panel</p>
      <LoginForm />
    </main>
  );
}
