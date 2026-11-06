import { Header } from "@/components/Header";
import { BUSINESS } from "@/lib/config";

export const metadata = { title: "Refund & Cancellation Policy — TownEats" };

export default function RefundPolicy() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-extrabold">Refund & Cancellation Policy</h1>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-stone-700">
          <p>
            TownEats is a slot-based food ordering and delivery service. Orders are placed before a
            slot cut-off, picked up from city restaurants, and delivered within a fixed window.
          </p>
          <h2 className="font-bold text-stone-900">Cancellations</h2>
          <p>
            You can cancel your order free of charge from the order tracking page any time before
            the restaurant starts preparing it (i.e., while the order status is "Confirmed"). Once
            preparation has started, cancellations are not possible because the food cost is
            already incurred.
          </p>
          <h2 className="font-bold text-stone-900">Refunds</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>If a slot does not reach its minimum order count, the slot is cancelled and all payments are refunded in full.</li>
            <li>If an item is unavailable, only that item's amount is refunded.</li>
            <li>If your order is cancelled after payment (by you or by us), the refund is processed to the original payment method within 3–5 business days.</li>
            <li>For payments made via UPI transfer, refunds are made to the same UPI account after verification.</li>
          </ul>
          <h2 className="font-bold text-stone-900">Food quality</h2>
          <p>
            Food is prepared and packed by the partner restaurants. If something is wrong with your
            order, contact us within 2 hours of delivery with a photo at{" "}
            <a className="font-semibold text-brand" href={`https://wa.me/${BUSINESS.supportWhatsapp}`}>
              {BUSINESS.supportPhone} (WhatsApp)
            </a>{" "}
            and we will make it right — replacement or refund.
          </p>
          <h2 className="font-bold text-stone-900">Contact</h2>
          <p>
            WhatsApp: {BUSINESS.supportPhone} · Operating in {BUSINESS.townName}
          </p>
        </div>
      </div>
    </main>
  );
}
