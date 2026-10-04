import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { APP_NAME } from "@/lib/brand";
import { card } from "@/components/ui";

export const metadata: Metadata = { title: "Terms and conditions" };

const SECTIONS: { title: string; who: string; points: string[] }[] = [
  {
    title: "Using the app",
    who: "Everyone",
    points: [
      `${APP_NAME} lets a store take orders from its own customers and deliver them. By using it you agree to these terms.`,
      "Use it only for genuine orders and the store's own work. Do not try to get into someone else's account, link or data.",
      "The store may change, pause or stop the service, and may close an account or a link that is misused.",
    ],
  },
  {
    title: "Orders, payment and delivery",
    who: "Customers",
    points: [
      "Your link is private and personal. It opens on one device only and may close after your order is finished. Do not share it.",
      "An order is accepted once the store confirms it. Prices and the delivery charge are the ones shown at checkout; the store may correct a mistake before confirming.",
      "You pay the store directly, in cash or by UPI or bank transfer. The app does not handle your money. A payment counts once the store confirms it; a screenshot alone is not proof of payment.",
      "Delivery times are estimates. Cancellations, returns and refunds are decided by the store: contact the store.",
    ],
  },
  {
    title: "Working with the store's data",
    who: "Store staff",
    points: [
      "Your account is for you alone. Keep your password and sign-in link private; you are responsible for what is done with them.",
      "Use customer names, phone numbers, addresses and payment screenshots only to serve their orders. Do not copy, share or keep them elsewhere.",
      "What you do in the app (orders, payments, deletions) is recorded with your name.",
    ],
  },
  {
    title: "Making deliveries",
    who: "Delivery partners",
    points: [
      "While you have an order out for delivery, the app shares your phone's location with the store. It stops when the delivery is done.",
      "Collect only the amount shown in the app, and hand over cash you collect to the store.",
      "Use a customer's phone number and address only for that delivery.",
    ],
  },
  {
    title: "Privacy",
    who: "Everyone",
    points: [
      "The app stores what is needed to run orders: your name, phone number, delivery address and map pin, your orders, and payment screenshots you upload.",
      "Only the store's staff see it, and a delivery partner sees what is needed for the delivery. It is not sold or shared with anyone else.",
      "Your name appears faintly on the screens you open. Screens and their contents must not be copied or shared without the store's permission.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="flex items-center gap-3">
        <Logo className="h-11 w-11" />
        <div>
          <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-ink">
            Terms and conditions
          </h1>
          <p className="text-sm text-ink-3">{APP_NAME}, updated 5 October 2026</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {SECTIONS.map((s) => (
          <section key={s.title} className={`${card} p-4`}>
            <p className="text-xs font-semibold text-brand-700">{s.who}</p>
            <h2 className="font-bold text-ink">{s.title}</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-2">
              {s.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-5 text-sm text-ink-3">
        These terms may be updated; the date above shows the latest version.
        Questions: contact the store.
      </p>
    </main>
  );
}
