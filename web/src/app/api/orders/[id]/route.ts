import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public order status — returns only what the status page needs.
// Access is gated by knowledge of the order id (cuid); no PII beyond
// what the customer who placed the order already knows is exposed.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  // Support the 6-char short id shown to customers (#PLV0OC) so ops can share
  // typeable links like /order/PLV0OC. Short ids are read-only — write
  // endpoints (cancel/claim) still require the full id.
  const isShort = /^[A-Za-z0-9]{6}$/.test(id);
  const order = isShort
    ? await db.order.findFirst({ where: { id: { endsWith: id.toLowerCase() } }, include: { slot: true, items: true } })
    : await db.order.findUnique({ where: { id }, include: { slot: true, items: true } });
  if (!order) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({
    id: order.id,
    status: order.status,
    totalPaise: order.totalPaise,
    customerName: order.customerName.split(" ")[0], // first name only
    area: order.area,
    deliveryWindow: {
      start: order.slot.deliveryStart,
      end: order.slot.deliveryEnd,
    },
    slotType: order.slot.type,
    items: order.items.map((i) => ({ name: i.nameSnapshot, qty: i.qty, pricePaise: i.pricePaiseSnap })),
  });
}
