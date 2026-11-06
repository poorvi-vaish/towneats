"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { formatINR } from "@/lib/config";
import QRCode from "qrcode";

declare global {
  interface Window {
    // Loaded from https://checkout.razorpay.com/v1/checkout.js
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay?: any;
  }
}

type CreateOrderResponse = {
  orderId: string;
  totalPaise: number;
  status: string;
  razorpay?: { keyId: string; orderId: string; amountPaise: number };
  manualUpi?: { upiId: string; amountPaise: number };
  error?: string;
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function ManualPayScreen({
  manualPay,
  onDone,
}: {
  manualPay: { upiId: string; amountPaise: number; orderId: string };
  onDone: () => void;
}) {
  // Payment-screen state machine: idle → payClicked (UPI app opened) → claimed.
  // Pay disables itself once the app is opened; "I've paid" becomes primary.
  const [payClicked, setPayClicked] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const storageKey = `pay_${manualPay.orderId}`;

  useEffect(() => {
    // Survive an accidental page reload after paying in the UPI app.
    if (sessionStorage.getItem(storageKey)) setPayClicked(true);
  }, [storageKey]);

  // UPI intent: opens GPay/PhonePe/Paytm with payee, amount and the order
  // id as the note pre-filled — no typing, clean reconciliation.
  const upiLink =
    `upi://pay?pa=${encodeURIComponent(manualPay.upiId)}` +
    `&pn=${encodeURIComponent("TownEats")}` +
    `&am=${(manualPay.amountPaise / 100).toFixed(2)}&cu=INR` +
    `&tn=${encodeURIComponent("Order " + manualPay.orderId.slice(-6).toUpperCase())}`;

  // QR of the same UPI payload — scanning is more reliable across apps than
  // the intent link (some apps mangle pre-filled amounts from intents).
  useEffect(() => {
    QRCode.toDataURL(upiLink, { width: 280, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [upiLink]);

  function handlePayClick() {
    setPayClicked(true);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // private mode etc. — in-memory state still works
    }
  }

  async function handlePaid() {
    setClaiming(true);
    try {
      // Tell ops to expect this payment (idempotent server-side).
      await fetch(`/api/orders/${manualPay.orderId}/claim-payment`, { method: "POST" });
    } catch {
      // non-fatal — proceed to tracking regardless
    }
    onDone();
  }

  return (
    <div className="mt-6 rounded-2xl border border-orange-100 bg-white p-6 text-center">
      <h2 className="text-xl font-extrabold">Pay {formatINR(manualPay.amountPaise)} via UPI</h2>

      {qrDataUrl && (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="UPI QR code" className="mx-auto w-56 rounded-xl border border-orange-100" />
          <p className="mt-2 text-sm font-semibold text-stone-700">
            Scan with GPay / PhonePe / Paytm — amount &amp; order note are embedded.
          </p>
          <p className="mt-1 text-xs text-stone-500">
            On the same phone? Screenshot this QR, then in your UPI app choose “Scan QR → open from
            gallery”.
          </p>
        </div>
      )}

      {payClicked ? (
        <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          UPI app opened — complete the payment there, then come back here.
        </p>
      ) : null}
      <a
        href={upiLink}
        onClick={handlePayClick}
        className="mt-3 inline-block text-sm font-semibold text-brand underline"
      >
        Or tap to open your UPI app
      </a>

      <p className="mt-4 text-sm text-stone-600">
        On a computer? Send <span className="font-bold">{formatINR(manualPay.amountPaise)}</span> to{" "}
        <span className="select-all font-bold text-stone-900">{manualPay.upiId}</span> with note{" "}
        <span className="font-semibold">Order {manualPay.orderId.slice(-6).toUpperCase()}</span>
      </p>

      <button
        onClick={handlePaid}
        disabled={claiming}
        className={`mt-5 w-full rounded-full py-3 font-bold transition disabled:opacity-50 ${
          payClicked
            ? "bg-brand text-lg text-white shadow-lg shadow-orange-200 hover:bg-brand-dark"
            : "border-2 border-brand text-brand hover:bg-brand hover:text-white"
        }`}
      >
        {claiming ? "Confirming…" : "I've paid — view my order"}
      </button>
    </div>
  );
}

export function CheckoutForm({
  slotId,
  areas,
  convenienceFeePaise,
  taxPaise,
  minOrderPaise,
}: {
  slotId: string;
  areas: string[];
  convenienceFeePaise: number;
  taxPaise: number;
  minOrderPaise: number;
}) {
  const cart = useCart();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState(areas[0] ?? "");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [manualPay, setManualPay] = useState<{ upiId: string; amountPaise: number; orderId: string } | null>(null);
  // Generated once per checkout session so double-submits can't double-order.
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const total = cart.subtotalPaise + convenienceFeePaise + taxPaise;
  const belowMinimum = cart.count > 0 && cart.subtotalPaise < minOrderPaise;

  async function placeOrder() {
    setError(null);
    if (cart.count === 0) return setError("Your cart is empty.");
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter a valid 10-digit mobile number.");
    if (address.trim().length < 5) return setError("Please enter your full address.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          customerName: name.trim(),
          phone,
          area,
          address: address.trim(),
          landmark: landmark.trim(),
          idempotencyKey,
          items: cart.lines.map((l) => ({ menuItemId: l.menuItemId, qty: l.qty })),
        }),
      });
      const data: CreateOrderResponse = await res.json();
      if (!res.ok) return setError(data.error ?? "Could not place the order. Please try again.");

      if (data.razorpay) {
        const ok = await loadRazorpayScript();
        if (!ok || !window.Razorpay) return setError("Could not load the payment gateway. Please try again.");
        const rzp = new window.Razorpay({
          key: data.razorpay.keyId,
          amount: data.razorpay.amountPaise,
          currency: "INR",
          name: "TownEats",
          description: "Food order",
          order_id: data.razorpay.orderId,
          prefill: { name: name.trim(), contact: phone },
          theme: { color: "#ea580c" },
          handler: async (resp: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            const verify = await fetch("/api/orders/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: data.orderId,
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              }),
            });
            if (verify.ok) {
              cart.clear();
              router.push(`/order/${data.orderId}?placed=1`);
            } else {
              setError("Payment verification failed. If money was debited, contact support with your payment ID.");
            }
          },
        });
        rzp.open();
      } else if (data.manualUpi) {
        setManualPay({ ...data.manualUpi, orderId: data.orderId });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (manualPay) {
    return (
      <ManualPayScreen
        manualPay={manualPay}
        onDone={() => {
          cart.clear();
          router.push(`/order/${manualPay.orderId}?placed=1`);
        }}
      />
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Cart summary */}
      <section className="rounded-2xl border border-orange-100 bg-white p-4">
        <h2 className="font-bold">Your order</h2>
        {cart.lines.length === 0 && (
          <p className="mt-2 text-sm text-stone-500">Cart is empty — go add something tasty.</p>
        )}
        <ul className="mt-2 divide-y divide-orange-50">
          {cart.lines.map((l) => (
            <li key={l.menuItemId} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-semibold">{l.name}</p>
                <p className="text-xs text-stone-500">{l.restaurantName}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-orange-200 px-2 py-0.5">
                  <button className="font-bold text-brand" onClick={() => cart.setQty(l.menuItemId, l.qty - 1)}>−</button>
                  <span className="min-w-4 text-center">{l.qty}</span>
                  <button className="font-bold text-brand" onClick={() => cart.setQty(l.menuItemId, l.qty + 1)}>+</button>
                </div>
                <span className="min-w-14 text-right font-semibold">
                  {formatINR(l.pricePaise * l.qty)}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-orange-100 pt-3 text-sm">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal</span>
            <span>{formatINR(cart.subtotalPaise)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Convenience fee</span>
            <span>{formatINR(convenienceFeePaise)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>GST &amp; taxes</span>
            <span>{formatINR(taxPaise)}</span>
          </div>
          <div className="flex justify-between text-base font-extrabold">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>
        </div>
        {belowMinimum && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Minimum order is {formatINR(minOrderPaise)} — add {formatINR(minOrderPaise - cart.subtotalPaise)} more to
            place this order.
          </p>
        )}
      </section>

      {/* Details */}
      <section className="space-y-3 rounded-2xl border border-orange-100 bg-white p-4">
        <h2 className="font-bold">Delivery details</h2>
        <input
          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 outline-none focus:border-brand"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoComplete="name"
        />
        <input
          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 outline-none focus:border-brand"
          placeholder="10-digit mobile number"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          autoComplete="tel"
        />
        <select
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-brand"
          value={area}
          onChange={(e) => setArea(e.target.value)}
        >
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <textarea
          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 outline-none focus:border-brand"
          placeholder="House / street address"
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={200}
        />
        <input
          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 outline-none focus:border-brand"
          placeholder="Landmark (optional)"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          maxLength={120}
        />
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
      )}

      <button
        onClick={placeOrder}
        disabled={submitting || cart.count === 0 || belowMinimum}
        className="w-full rounded-full bg-brand py-4 text-lg font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Placing order…" : `Pay ${formatINR(total)} & place order`}
      </button>
      <p className="text-center text-xs text-stone-500">
        If the slot doesn't reach minimum orders, you get a full automatic refund.
      </p>
    </div>
  );
}
