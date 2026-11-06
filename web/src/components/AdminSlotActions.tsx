"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSlotActions({
  slotId,
  adminKey,
  pickupCount,
  ofdCount,
}: {
  slotId: string;
  adminKey: string;
  pickupCount: number; // orders that can move to PICKED_UP
  ofdCount: number; // orders that can move to OUT_FOR_DELIVERY
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function call(payload: object) {
    setBusy(true);
    try {
      await fetch(`/api/admin/slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(payload),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function cancelSlot() {
    if (!confirm("Cancel this slot? All its undelivered orders will be cancelled and paid ones marked for refund.")) {
      return;
    }
    await call({ action: "cancel_slot" });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {pickupCount > 0 && (
        <button
          disabled={busy}
          onClick={() => call({ action: "bulk_status", to: "PICKED_UP" })}
          className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
        >
          🛵 Picked up all ({pickupCount})
        </button>
      )}
      {ofdCount > 0 && (
        <button
          disabled={busy}
          onClick={() => call({ action: "bulk_status", to: "OUT_FOR_DELIVERY" })}
          className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
        >
          📦 Out for delivery all ({ofdCount})
        </button>
      )}
      <button
        disabled={busy}
        onClick={cancelSlot}
        className="rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-600 disabled:opacity-50"
      >
        Cancel slot
      </button>
    </div>
  );
}
