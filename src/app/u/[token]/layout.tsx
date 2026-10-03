import type { Metadata } from "next";
import { Watermark } from "@/components/Watermark";
import { APP_NAME } from "@/lib/brand";
import { resolveCustomer } from "@/lib/customer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  return {
    manifest: `/u/${token}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  };
}

export default async function CustomerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Every screenshot of a customer's pages carries that customer's name
  // (only once this device owns the link; before that nothing of theirs shows).
  const customer = await resolveCustomer(token);
  return (
    <>
      {children}
      {customer && <Watermark text={`${customer.name} · ${customer.phone}`} />}
    </>
  );
}
