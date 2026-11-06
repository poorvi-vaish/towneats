import { db } from "@/lib/db";
import { ensureSlots } from "@/lib/slots";
import { adminPageAuthorized } from "@/lib/admin";
import { formatINR } from "@/lib/config";
import { getRestaurantByName } from "@/lib/menu";
import { AdminOrderActions } from "@/components/AdminOrderActions";
import { AdminSlotActions } from "@/components/AdminSlotActions";

export const dynamic = "force-dynamic";

function istToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function fmtIST(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  if (!adminPageAuthorized(key)) {
    return (
      <main className="mx-auto max-w-md px-4 pt-24 text-center">
        <h1 className="text-xl font-bold">Ops dashboard</h1>
        <p className="mt-2 text-sm text-stone-500">
          Append <code className="rounded bg-stone-100 px-1">?key=YOUR_ADMIN_SECRET</code> to the URL.
        </p>
      </main>
    );
  }

  await ensureSlots();
  const today = istToday();
  // Show today AND tomorrow — orders placed after tonight's cut-off book
  // into tomorrow's slots and must not be invisible to ops.
  const slots = await db.slot.findMany({
    where: { date: { gte: today } },
    orderBy: { cutoffAt: "asc" },
    take: 4,
    include: {
      orders: {
        where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
        include: { items: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Paid orders that were cancelled (slot cancelled, ops cancel, expired
  // after paying) — these owe the customer money until marked refunded.
  const refundDue = await db.order.findMany({
    where: { status: "CANCELLED", paidAt: { not: null } },
    include: { slot: true },
    orderBy: { paidAt: "desc" },
    take: 20,
  });

  // Unconfirmed payments needing a human: customer claimed payment, or the
  // order is old enough that a QR payment may exist without a claim. Match
  // against bank credits (note contains "Order #ID") and mark paid / cancel.
  const needsAttention = await db.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      OR: [
        { paymentClaimedAt: { not: null } },
        { createdAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } },
      ],
    },
    include: { slot: true, items: true },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Ops dashboard — from {today}</h1>
        <a
          href={`/api/admin/export?key=${encodeURIComponent(key!)}`}
          className="rounded-full border border-orange-200 bg-white px-4 py-1.5 text-sm font-semibold text-brand hover:border-brand"
        >
          ⬇ Orders CSV
        </a>
      </div>

      {needsAttention.length > 0 && (
        <section className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-800">⚠️ Unconfirmed payments ({needsAttention.length})</h2>
          <p className="mt-1 text-sm text-amber-700">
            Check your bank app for credits with note &quot;Order #ID&quot;, then mark paid or
            cancel. Claimed orders never auto-cancel; unclaimed ones only expire while their slot
            is open.
          </p>
          <ul className="mt-3 space-y-2">
            {needsAttention.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm"
              >
                <div>
                  <p className="font-bold">
                    #{o.id.slice(-6).toUpperCase()} · {o.customerName} · {o.phone} ·{" "}
                    {formatINR(o.totalPaise)}
                    {o.paymentClaimedAt ? " · 📣 claimed" : ""}
                  </p>
                  <p className="text-xs text-stone-500">
                    {o.slot.date} {o.slot.type} · placed{" "}
                    {o.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </p>
                </div>
                <AdminOrderActions orderId={o.id} status={o.status} adminKey={key!} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {refundDue.length > 0 && (
        <section className="mt-4 rounded-2xl border-2 border-red-300 bg-red-50 p-5">
          <h2 className="font-bold text-red-800">💸 Refund due ({refundDue.length})</h2>
          <p className="mt-1 text-sm text-red-700">
            These customers paid but their orders were cancelled. Refund each one, then mark it.
          </p>
          <ul className="mt-3 space-y-2">
            {refundDue.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm"
              >
                <div>
                  <p className="font-bold">
                    #{o.id.slice(-6).toUpperCase()} · {o.customerName} · {o.phone} ·{" "}
                    {formatINR(o.totalPaise)}
                  </p>
                  <p className="text-xs text-stone-500">
                    {o.slot.date} {o.slot.type} · paid {o.paidAt?.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </p>
                </div>
                <AdminOrderActions orderId={o.id} status={o.status} adminKey={key!} refundDue />
              </li>
            ))}
          </ul>
        </section>
      )}

      {slots.map((slot) => {
        const paid = slot.orders.filter((o) => o.status !== "PENDING_PAYMENT");
        const revenue = paid.reduce((n, o) => n + o.totalPaise, 0);
        const pickupCount = slot.orders.filter((o) => ["CONFIRMED", "PREPARING"].includes(o.status)).length;
        const ofdCount = slot.orders.filter((o) =>
          ["CONFIRMED", "PREPARING", "PICKED_UP"].includes(o.status)
        ).length;

        // Aggregated pickup list per restaurant
        const byRestaurant = new Map<string, { phone: string; area: string; items: Map<string, number> }>();
        for (const o of paid) {
          for (const it of o.items) {
            const r = getRestaurantByName(it.restaurantName);
            if (!byRestaurant.has(it.restaurantName)) {
              byRestaurant.set(it.restaurantName, {
                phone: r?.phone ?? "—",
                area: r?.area ?? "—",
                items: new Map(),
              });
            }
            const entry = byRestaurant.get(it.restaurantName)!;
            entry.items.set(it.nameSnapshot, (entry.items.get(it.nameSnapshot) ?? 0) + it.qty);
          }
        }

        return (
          <section key={slot.id} className="mt-6 rounded-2xl border border-orange-100 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">
                {slot.date} · Delivery {fmtIST(slot.deliveryStart)} – {fmtIST(slot.deliveryEnd)} ·{" "}
                <span className={slot.status === "OPEN" ? "text-green-600" : "text-stone-500"}>
                  {slot.status}
                </span>
              </h2>
              <p className="text-sm text-stone-600">
                {paid.length}/{slot.capacity} orders · {formatINR(revenue)} · min {slot.minOrders}
                {paid.length < slot.minOrders ? " ⚠️ below minimum" : " ✅"}
              </p>
              {slot.status !== "COMPLETED" && (
                <AdminSlotActions
                  slotId={slot.id}
                  adminKey={key!}
                  pickupCount={pickupCount}
                  ofdCount={ofdCount}
                  slotStatus={slot.status}
                />
              )}
            </div>

            {/* Rider pickup list */}
            <div className="mt-4">
              <h3 className="font-bold text-stone-700">🛵 Pickup list (city)</h3>
              {byRestaurant.size === 0 && <p className="text-sm text-stone-400">No paid orders yet.</p>}
              {[...byRestaurant.entries()].map(([name, r]) => (
                <div key={name} className="mt-2 rounded-xl bg-orange-50 p-3 text-sm">
                  <p className="font-bold">
                    {name} <span className="font-normal text-stone-500">· {r.area} · {r.phone}</span>
                  </p>
                  <ul className="mt-1 text-stone-700">
                    {[...r.items.entries()].map(([item, qty]) => (
                      <li key={item}>
                        {item} × {qty}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Delivery list */}
            <div className="mt-4">
              <h3 className="font-bold text-stone-700">📦 Deliveries (town)</h3>
              {slot.orders.length === 0 && <p className="text-sm text-stone-400">No orders yet.</p>}
              <ul className="mt-2 space-y-2">
                {slot.orders.map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-100 p-3 text-sm"
                  >
                    <div>
                      <p className="font-bold">
                        #{o.id.slice(-6).toUpperCase()} · {o.customerName} · {o.phone}
                      </p>
                      <p className="text-stone-600">
                        {o.area} — {o.address}
                        {o.landmark ? ` (${o.landmark})` : ""}
                      </p>
                      <p className="text-xs text-stone-500">
                        {o.items.map((i) => `${i.nameSnapshot}×${i.qty}`).join(", ")} ·{" "}
                        {formatINR(o.totalPaise)} ·{" "}
                        <span className="font-semibold">{o.status}</span>
                        {o.paymentProvider === "manual_upi" && o.status === "PENDING_PAYMENT"
                          ? " (manual UPI — check your bank app)"
                          : ""}
                      </p>
                    </div>
                    <AdminOrderActions orderId={o.id} status={o.status} adminKey={key!} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </main>
  );
}
