import { Header } from "@/components/Header";
import { BUSINESS } from "@/lib/config";

export const metadata = { title: "Terms of Service — TownEats" };

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-extrabold">Terms of Service</h1>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-stone-700">
          <p>By ordering on TownEats you agree to these terms.</p>
          <h2 className="font-bold text-stone-900">The service</h2>
          <p>
            TownEats collects food orders for fixed delivery slots, purchases them from partner
            restaurants in {BUSINESS.cityName} on your behalf, and delivers them in{" "}
            {BUSINESS.townName} within the slot window shown at checkout. Menu prices, convenience
            fee, and taxes are shown before payment.
          </p>
          <h2 className="font-bold text-stone-900">Orders & slots</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Orders close at the slot cut-off time; slots have limited capacity.</li>
            <li>If a slot does not reach its minimum order count, it is cancelled and payments are refunded in full.</li>
            <li>Delivery windows are estimates; delays due to weather, traffic, or restaurant issues will be communicated via order status updates.</li>
          </ul>
          <h2 className="font-bold text-stone-900">Payments</h2>
          <p>
            Payments are processed by Razorpay or via direct UPI transfer. Food is prepared by
            partner restaurants, who are responsible for food quality and hygiene.
          </p>
          <h2 className="font-bold text-stone-900">Contact</h2>
          <p>WhatsApp: {BUSINESS.supportPhone} · {BUSINESS.townName}</p>
        </div>
      </div>
    </main>
  );
}
