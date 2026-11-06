import Link from "next/link";
import { Header } from "@/components/Header";
import { Countdown } from "@/components/Countdown";
import { getSlotBoard, type SlotView } from "@/lib/slots";
import { BUSINESS } from "@/lib/config";

// Cache the public page for 30s — slot open/close and countdowns stay
// accurate (countdown is client-side), and the order API re-validates
// capacity at checkout, so stale "spots left" can never oversell a slot.
export const revalidate = 30;

function SlotCard({ slot, highlighted }: { slot: SlotView; highlighted: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlighted ? "border-brand bg-white shadow-lg shadow-orange-100" : "border-orange-100 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          {slot.type === "LUNCH" ? "☀️ Lunch slot" : "🌙 Dinner slot"}
        </span>
        {slot.isOpen ? (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            {slot.spotsLeft} spots left
          </span>
        ) : (
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-500">
            {slot.reason}
          </span>
        )}
      </div>
      <p className="mt-2 text-lg font-bold">
        Delivery {slot.deliveryWindow}
      </p>
      {slot.isOpen ? (
        <p className="mt-1 text-sm text-stone-600">
          Order by <span className="font-bold text-stone-900">{slot.cutoffLabel}</span>{" "}
          (<Countdown targetIso={slot.cutoffAt} /> left)
        </p>
      ) : null}
    </div>
  );
}

export default async function Home() {
  // Build-time prerender must not depend on DB availability; runtime
  // revalidation fills in real slot data within 30s.
  let current = null as Awaited<ReturnType<typeof getSlotBoard>>["current"];
  let next = null as Awaited<ReturnType<typeof getSlotBoard>>["next"];
  try {
    ({ current, next } = await getSlotBoard());
  } catch (e) {
    console.error("slot board unavailable", e);
  }
  const ctaSlot = current ?? next;

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 pt-10 pb-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Hardoi ke chatkaro ka swaad,{" "}
          <span className="text-brand">ab ghar baithe lo ek saath!</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-stone-600">
          Order from the city's most-loved restaurants before the cut-off.
          Our rider picks up everything in one trip and delivers in a fixed window.
        </p>
      </section>

      {/* Slots */}
      <section className="mx-auto max-w-3xl space-y-3 px-4">
        {current && <SlotCard slot={current} highlighted />}
        {next && <SlotCard slot={next} highlighted={false} />}
        {!current && !next && (
          <p className="rounded-2xl bg-white p-6 text-center text-stone-500">
            No upcoming slots today — check back tomorrow morning.
          </p>
        )}
        {ctaSlot && (
          <Link
            href="/menu"
            className="block rounded-2xl bg-brand py-4 text-center text-lg font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-brand-dark"
          >
            {current
              ? `Order now — delivery ${current.deliveryWindow}`
              : `Pre-order for ${ctaSlot.label} — delivery ${ctaSlot.deliveryWindow}`}
          </Link>
        )}
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: "🍽️", title: "1. Order & pay", text: "Pick your favourites and pay online before the slot cut-off." },
            { icon: "🛵", title: "2. We collect", text: "Our rider in the city picks up all orders from the restaurants." },
            { icon: "📦", title: "3. Delivered", text: `Your food arrives in ${BUSINESS.townName} within the slot window.` },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border border-orange-100 bg-white p-5">
              <div className="text-2xl">{s.icon}</div>
              <p className="mt-2 font-bold">{s.title}</p>
              <p className="mt-1 text-sm text-stone-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Areas */}
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <div className="rounded-2xl border border-orange-100 bg-white p-5">
          <p className="font-bold">📍 We currently deliver to</p>
          <p className="mt-1 text-sm text-stone-600">{BUSINESS.servicedAreas.join(" · ")}</p>
          <p className="mt-3 text-sm text-stone-600">
            Questions? WhatsApp us at{" "}
            <a className="font-semibold text-brand" href={`https://wa.me/${BUSINESS.supportWhatsapp}`}>
              {BUSINESS.supportPhone}
            </a>
          </p>
        </div>
      </section>

      {/* Footer — policies (also required by payment-gateway KYC) */}
      <footer className="border-t border-orange-100">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-stone-500">
          <a href="/policies/refund" className="hover:text-brand">Refund & Cancellation</a>
          <a href="/policies/terms" className="hover:text-brand">Terms of Service</a>
          <a href="/policies/privacy" className="hover:text-brand">Privacy Policy</a>
          <span>·</span>
          <span>TownEats · {BUSINESS.townName}</span>
        </div>
      </footer>
    </main>
  );
}
