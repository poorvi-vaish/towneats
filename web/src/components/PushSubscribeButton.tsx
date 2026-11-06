"use client";

import { useState } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushSubscribeButton({ orderId }: { orderId: string }) {
  const [state, setState] = useState<"idle" | "working" | "done" | "denied" | "unsupported">("idle");

  // No keys configured → hide the feature entirely.
  if (!VAPID_PUBLIC) return null;

  async function enable() {
    setState("working");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return setState("unsupported");
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState("denied");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC!),
      });
      const res = await fetch(`/api/orders/${orderId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setState(res.ok ? "done" : "idle");
    } catch {
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <p className="rounded-2xl bg-green-50 p-3 text-center text-sm font-semibold text-green-800">
        🔔 You'll get live updates on this device.
      </p>
    );
  }

  return (
    <div className="text-center">
      <button
        onClick={enable}
        disabled={state === "working"}
        className="rounded-full border-2 border-brand px-6 py-2.5 font-bold text-brand transition hover:bg-brand hover:text-white disabled:opacity-50"
      >
        {state === "working" ? "Enabling…" : "🔔 Get live updates on this device"}
      </button>
      {state === "denied" && (
        <p className="mt-1 text-xs text-stone-500">
          Notifications are blocked in your browser settings — you can still watch this page.
        </p>
      )}
      {state === "unsupported" && (
        <p className="mt-1 text-xs text-stone-500">
          This browser doesn't support push here. On iPhone: share → Add to Home Screen, then open
          the app icon.
        </p>
      )}
    </div>
  );
}
