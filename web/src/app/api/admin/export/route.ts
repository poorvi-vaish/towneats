import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminPageAuthorized } from "@/lib/admin";

// Full order export for backup/audit. Download regularly — this plus Neon's
// point-in-time restore is your data-loss insurance.
// Usage: /api/admin/export?key=ADMIN_SECRET  (opens as a CSV download)
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") ?? undefined;
  if (!adminPageAuthorized(key)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const orders = await db.order.findMany({
    include: { slot: true, items: true },
    orderBy: { createdAt: "asc" },
  });

  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = "order_id,created_at,slot_date,slot_type,customer_name,phone,area,address,landmark,items,subtotal_paise,delivery_fee_paise,total_paise,status,payment_provider,payment_id,paid_at";
  const rows = orders.map((o) =>
    [
      o.id,
      o.createdAt.toISOString(),
      o.slot.date,
      o.slot.type,
      o.customerName,
      o.phone,
      o.area,
      o.address,
      o.landmark,
      o.items.map((i) => `${i.nameSnapshot} x${i.qty} @${i.pricePaiseSnap}`).join("; "),
      o.subtotalPaise,
      o.deliveryFeePaise,
      o.totalPaise,
      o.status,
      o.paymentProvider,
      o.paymentId,
      o.paidAt?.toISOString(),
    ].map(esc).join(",")
  );

  return new NextResponse([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="towneats-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
