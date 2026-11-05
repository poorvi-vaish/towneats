import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminAuthorized } from "@/lib/admin";
import {
  notifyNewOrderWhatsApp,
  notifyCustomerOrderConfirmed,
  notifyCustomerOutForDelivery,
  notifyCustomerDelivered,
  notifyCustomerRefund,
} from "@/lib/notify";

const patchSchema = z
  .strictObject({
    action: z.enum(["advance_status", "mark_paid", "cancel", "mark_refunded"]),
  });

const STATUS_FLOW = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PREPARING",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!adminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found." }, { status: 404 });

  switch (parsed.data.action) {
    case "advance_status": {
      const idx = STATUS_FLOW.indexOf(order.status as (typeof STATUS_FLOW)[number]);
      if (idx < 0 || idx === STATUS_FLOW.length - 1) {
        return NextResponse.json({ error: "Order status cannot advance." }, { status: 409 });
      }
      // Never advance past an unpaid order.
      if (order.status === "PENDING_PAYMENT") {
        return NextResponse.json({ error: "Order is not paid yet." }, { status: 409 });
      }
      const updated = await db.order.update({ where: { id }, data: { status: STATUS_FLOW[idx + 1] } });
      if (updated.status === "OUT_FOR_DELIVERY" || updated.status === "DELIVERED") {
        const full = await db.order.findUnique({ where: { id }, include: { slot: true, items: true } });
        if (full) {
          if (updated.status === "OUT_FOR_DELIVERY") await notifyCustomerOutForDelivery(full);
          else await notifyCustomerDelivered(full);
        }
      }
      return NextResponse.json({ status: updated.status });
    }
    case "mark_paid": {
      // For manual UPI mode: admin confirms the UPI credit in their bank app.
      if (order.status !== "PENDING_PAYMENT") {
        return NextResponse.json({ error: "Order is not awaiting payment." }, { status: 409 });
      }
      const updated = await db.order.update({
        where: { id },
        data: { status: "CONFIRMED", paidAt: new Date(), paymentId: "manual_upi" },
      });
      const full = await db.order.findUnique({ where: { id }, include: { slot: true, items: true } });
      if (full) {
        await notifyNewOrderWhatsApp(full);
        await notifyCustomerOrderConfirmed(full);
      }
      return NextResponse.json({ status: updated.status });
    }
    case "cancel": {
      if (order.status === "DELIVERED" || order.status === "REFUNDED") {
        return NextResponse.json({ error: "Order cannot be cancelled." }, { status: 409 });
      }
      const updated = await db.order.update({ where: { id }, data: { status: "CANCELLED" } });
      if (order.paidAt) {
        const full = await db.order.findUnique({ where: { id }, include: { slot: true, items: true } });
        if (full) await notifyCustomerRefund(full);
      }
      return NextResponse.json({ status: updated.status });
    }
    case "mark_refunded": {
      // Only a cancelled order that actually took money can be refunded.
      if (order.status !== "CANCELLED" || !order.paidAt) {
        return NextResponse.json({ error: "Only cancelled paid orders can be marked refunded." }, { status: 409 });
      }
      const updated = await db.order.update({ where: { id }, data: { status: "REFUNDED" } });
      return NextResponse.json({ status: updated.status });
    }
  }
}
