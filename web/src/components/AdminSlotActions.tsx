"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSlotActions({ slotId, adminKey }: { slotId: string; adminKey: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function cancelSlot() {
    if (!confirm("Cancel this slot? All its undelivered orders will be cancelled and paid ones marked for refund.")) {
      return;
    }
    setBusy(true);
    try {
      await fetch(`/api/admin/slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ action: "cancel_slot" }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      disabled={busy}
      onClick={cancelSlot}
      className="rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-600 disabled:opacity-50"
    >
      Cancel slot
    </button>
  );
}
