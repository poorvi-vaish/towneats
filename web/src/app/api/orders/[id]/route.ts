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
  const order = await db.order.findUnique({
    where: { id },
    include: { slot: true, items: true },
  });
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
