"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminOrderActions({
  orderId,
  status,
  adminKey,
  refundDue = false,
}: {
  orderId: string;
  status: string;
  adminKey: string;
  refundDue?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const terminal = ["DELIVERED", "CANCELLED", "REFUNDED"].includes(status);

  return (
    <div className="flex gap-2">
      {refundDue && (
        <button
          disabled={busy}
          onClick={() => act("mark_refunded")}
          className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
        >
          Mark refunded
        </button>
      )}
      {status === "PENDING_PAYMENT" && (
        <button
          disabled={busy}
          onClick={() => act("mark_paid")}
          className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
        >
          Mark paid
        </button>
      )}
      {!terminal && status !== "PENDING_PAYMENT" && (
        <button
          disabled={busy}
          onClick={() => act("advance_status")}
          className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
        >
          Next status →
        </button>
      )}
      {!terminal && (
        <button
          disabled={busy}
          onClick={() => act("cancel")}
          className="rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-600 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
