import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { notifyNewOrderWhatsApp } from "@/lib/notify";

// Optional but recommended in production: configure this URL in the
// Razorpay dashboard so payments are confirmed server-to-server even if
// the customer closes the browser before the callback completes.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (event.event === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id && payment.id) {
      const order = await db.order.findFirst({
        where: { paymentOrderId: payment.order_id, status: "PENDING_PAYMENT" },
        include: { slot: true, items: true },
      });
      if (order) {
        await db.order.update({
          where: { id: order.id },
          data: { status: "CONFIRMED", paymentId: payment.id, paidAt: new Date() },
        });
        await notifyNewOrderWhatsApp(order);
      }
    }
  }
  return NextResponse.json({ ok: true });
}
