import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyCustomerRefund, notifyOrderCancelledWhatsApp } from "@/lib/notify";
import { sendOrderStatusPush } from "@/lib/push";

// Customer self-cancellation. Access is gated by knowledge of the order id
// (same capability model as the tracking page). Allowed until the restaurant
// starts preparing — after that the food cost is already sunk.
// Paid cancellations surface in the ops dashboard's "refund due" queue.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || !/^[a-z0-9]{10,40}$/i.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const order = await db.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return NextResponse.json({ status: order.status }); // idempotent
  }
  if (order.status !== "PENDING_PAYMENT" && order.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Preparation has started, so this order can no longer be cancelled. Please contact support." },
      { status: 409 }
    );
  }

  const updated = await db.order.update({ where: { id }, data: { status: "CANCELLED" } });
  if (order.paidAt) {
    const full = await db.order.findUnique({ where: { id }, include: { slot: true, items: true } });
    if (full) {
      await notifyCustomerRefund(full);
      await notifyOrderCancelledWhatsApp(full);
      await sendOrderStatusPush(full);
    }
  }
  return NextResponse.json({ status: updated.status, refundDue: Boolean(order.paidAt) });
}
