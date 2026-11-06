import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyPaymentClaimedWhatsApp } from "@/lib/notify";

// Manual UPI flow: customer tapped "I've paid". Ping ops once to verify the
// credit in the bank app. paymentClaimedAt makes repeat taps idempotent.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || !/^[a-z0-9]{10,40}$/i.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const order = await db.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (order.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ ok: true }); // already handled — nothing to do
  }
  if (order.paymentClaimedAt) {
    return NextResponse.json({ ok: true, notified: "already_claimed" }); // don't spam ops
  }

  await db.order.update({ where: { id }, data: { paymentClaimedAt: new Date() } });
  const full = await db.order.findUnique({ where: { id }, include: { slot: true, items: true } });
  const notified = full ? await notifyPaymentClaimedWhatsApp(full) : false;

  return NextResponse.json({ ok: true, notified });
}
