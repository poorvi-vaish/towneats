import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { notifyNewOrderWhatsApp, notifyCustomerOrderConfirmed } from "@/lib/notify";

const verifySchema = z
  .strictObject({
    orderId: z.string().min(1).max(64),
    razorpayOrderId: z.string().min(1).max(64),
    razorpayPaymentId: z.string().min(1).max(64),
    razorpaySignature: z.string().min(1).max(512),
  });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentOrderId !== razorpayOrderId) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.status === "CONFIRMED") {
    return NextResponse.json({ ok: true }); // idempotent
  }
  if (order.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "This order can no longer be paid for." }, { status: 409 });
  }

  if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  await db.order.update({
    where: { id: orderId },
    data: { status: "CONFIRMED", paymentId: razorpayPaymentId, paidAt: new Date() },
  });

  const full = await db.order.findUnique({ where: { id: orderId }, include: { slot: true, items: true } });
  if (full) {
    await notifyNewOrderWhatsApp(full);
    await notifyCustomerOrderConfirmed(full);
  }

  return NextResponse.json({ ok: true });
}
