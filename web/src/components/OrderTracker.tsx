"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/config";

const STEPS = [
  { key: "PENDING_PAYMENT", label: "Awaiting payment", icon: "💳" },
  { key: "CONFIRMED", label: "Order confirmed", icon: "✅" },
  { key: "PREPARING", label: "Being prepared", icon: "👨‍🍳" },
  { key: "PICKED_UP", label: "Picked up from city", icon: "🛵" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery", icon: "📦" },
  { key: "DELIVERED", label: "Delivered", icon: "🎉" },
];

type OrderStatusPayload = {
  id: string;
  status: string;
  totalPaise: number;
  customerName: string;
  area: string;
  slotType: string;
  deliveryWindow: { start: string; end: string };
  items: Array<{ name: string; qty: number; pricePaise: number }>;
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function OrderTracker({ orderId, justPlaced }: { orderId: string; justPlaced: boolean }) {
  const [order, setOrder] = useState<OrderStatusPayload | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function cancelOrder() {
    if (!confirm("Cancel this order? If you paid, the refund will be processed to your payment method.")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error ?? "Could not cancel the order.");
      } else {
        setOrder((prev) => (prev ? { ...prev, status: data.status } : prev));
      }
    } catch {
      setCancelError("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.status === 404) {
          setNotFound(true);
          return; // never poll again for a missing order
        }
        if (!res.ok) throw new Error("transient");
        const data: OrderStatusPayload = await res.json();
        if (stop) return;
        setOrder(data);
        // Terminal state reached — no more polling.
        if (["DELIVERED", "CANCELLED", "REFUNDED"].includes(data.status)) return;
      } catch {
        // transient network error — keep polling
      }
      timer = setTimeout(poll, 10000);
    }

    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [orderId]);

  if (notFound) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-stone-600">
        Order not found. Check the link or contact support.
      </div>
    );
  }
  if (!order) {
    return <div className="rounded-2xl bg-white p-6 text-center text-stone-400">Loading…</div>;
  }

  const cancelled = order.status === "CANCELLED" || order.status === "REFUNDED";
  const cancellable = order.status === "PENDING_PAYMENT" || order.status === "CONFIRMED";
  const currentIdx = STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="space-y-4">
      {justPlaced && (
        <div className="rounded-2xl bg-green-50 p-4 text-center font-semibold text-green-800">
          🎉 Order placed! Save this page link to track your delivery.
        </div>
      )}

      <div className="rounded-2xl border border-orange-100 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-stone-500">Order #{order.id.slice(-6).toUpperCase()}</p>
            <p className="font-bold">
              {order.slotType === "LUNCH" ? "☀️ Lunch" : "🌙 Dinner"} · {order.area}
            </p>
          </div>
          <p className="font-extrabold">{formatINR(order.totalPaise)}</p>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          Delivery window: {fmtTime(order.deliveryWindow.start)} – {fmtTime(order.deliveryWindow.end)}
        </p>
      </div>

      {cancelled ? (
        <div className="rounded-2xl bg-red-50 p-5 text-center text-red-700">
          <p className="font-bold">
            {order.status === "REFUNDED" ? "This order was refunded." : "This order was cancelled."}
          </p>
          <p className="mt-1 text-sm">
            If you paid, the refund is processed automatically to the original payment method.
          </p>
        </div>
      ) : (
        <ol className="space-y-0 rounded-2xl border border-orange-100 bg-white p-5">
          {STEPS.map((s, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <li key={s.key} className="flex items-center gap-3 py-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-base ${
                    done ? "bg-green-100" : "bg-stone-100 opacity-40"
                  }`}
                >
                  {s.icon}
                </span>
                <span
                  className={`${
                    active ? "font-bold text-stone-900" : done ? "text-stone-700" : "text-stone-400"
                  }`}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="rounded-2xl border border-orange-100 bg-white p-5">
        <p className="font-bold">Items</p>
        <ul className="mt-2 divide-y divide-orange-50 text-sm">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex justify-between py-1.5">
              <span>
                {i.name} × {i.qty}
              </span>
              <span>{formatINR(i.pricePaise * i.qty)}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link href="/menu" className="block text-center text-sm font-semibold text-brand">
        ← Order more
      </Link>

      {cancellable && (
        <div className="text-center">
          <button
            onClick={cancelOrder}
            disabled={cancelling}
            className="text-sm font-semibold text-red-600 underline underline-offset-2 disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel this order"}
          </button>
          <p className="mt-1 text-xs text-stone-400">Free cancellation until preparation starts.</p>
          {cancelError && <p className="mt-1 text-xs font-semibold text-red-600">{cancelError}</p>}
        </div>
      )}
    </div>
  );
}
