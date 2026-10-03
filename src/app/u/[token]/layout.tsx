import { Watermark } from "@/components/Watermark";
import { resolveCustomer } from "@/lib/customer";

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
