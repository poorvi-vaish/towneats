import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminAuthorized } from "@/lib/admin";
import { notifyCustomerRefund, notifyCustomerOutForDelivery } from "@/lib/notify";
import { sendOrderStatusPush } from "@/lib/push";

const patchSchema = z
  .strictObject({
    action: z.enum(["cancel_slot", "reopen_slot", "bulk_status"]),
    to: z.enum(["PICKED_UP", "OUT_FOR_DELIVERY"]).optional(),
  })
  .refine((d) => d.action !== "bulk_status" || d.to !== undefined, {
    message: "'to' is required for bulk_status",
  });

// Which statuses may move into the bulk target. Never touches unpaid,
// delivered, or cancelled orders.
const BULK_SOURCES: Record<"PICKED_UP" | "OUT_FOR_DELIVERY", Array<"CONFIRMED" | "PREPARING" | "PICKED_UP">> = {
  PICKED_UP: ["CONFIRMED", "PREPARING"],
  OUT_FOR_DELIVERY: ["CONFIRMED", "PREPARING", "PICKED_UP"],
};

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

  const slot = await db.slot.findUnique({ where: { id } });
  if (!slot) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (parsed.data.action === "reopen_slot") {
    if (slot.status !== "CANCELLED") {
      return NextResponse.json({ error: "Only cancelled slots can be reopened." }, { status: 409 });
    }
    if (slot.cutoffAt < new Date()) {
      return NextResponse.json({ error: "Cut-off has passed — this slot cannot be reopened." }, { status: 409 });
    }
    await db.slot.update({ where: { id }, data: { status: "OPEN" } });
    return NextResponse.json({ status: "OPEN" });
  }

  if (slot.status === "COMPLETED" || slot.status === "CANCELLED") {
    return NextResponse.json({ error: "Slot is already closed." }, { status: 409 });
  }

  if (parsed.data.action === "bulk_status") {
    const to = parsed.data.to!;
    const affected = await db.order.findMany({
      where: { slotId: id, status: { in: BULK_SOURCES[to] } },
      include: { slot: true, items: true },
    });
    if (affected.length === 0) {
      return NextResponse.json({ error: "No orders in a state that can advance." }, { status: 409 });
    }
    await db.order.updateMany({
      where: { id: { in: affected.map((o) => o.id) } },
      data: { status: to },
    });
    // Notify customers (≤ slot capacity, so a small loop).
    for (const o of affected) {
      await sendOrderStatusPush({ ...o, status: to });
      if (to === "OUT_FOR_DELIVERY") await notifyCustomerOutForDelivery(o);
    }
    return NextResponse.json({ status: to, count: affected.length });
  }

  // cancel_slot: cancel the slot and every undelivered order on it, atomically.
  // Paid orders become CANCELLED with paidAt set → they surface in the
  // dashboard's "refund due" list until marked refunded.
  const affected = await db.order.findMany({
    where: { slotId: id, status: { notIn: ["DELIVERED", "CANCELLED", "REFUNDED"] }, paidAt: { not: null } },
    include: { slot: true, items: true },
  });
  await db.$transaction([
    db.slot.update({ where: { id }, data: { status: "CANCELLED" } }),
    db.order.updateMany({
      where: { slotId: id, status: { notIn: ["DELIVERED", "CANCELLED", "REFUNDED"] } },
      data: { status: "CANCELLED" },
    }),
  ]);
  // Notify each paid customer about the refund (≤ slot capacity, so a small loop).
  for (const o of affected) {
    await notifyCustomerRefund(o);
    await sendOrderStatusPush({ ...o, status: "CANCELLED" });
  }
  return NextResponse.json({ status: "CANCELLED" });
}
