import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminAuthorized } from "@/lib/admin";
import { notifyCustomerRefund } from "@/lib/notify";
import { sendOrderStatusPush } from "@/lib/push";

const patchSchema = z
  .strictObject({
    action: z.enum(["cancel_slot"]),
  });

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
  if (slot.status === "COMPLETED" || slot.status === "CANCELLED") {
    return NextResponse.json({ error: "Slot is already closed." }, { status: 409 });
  }

  // Cancel the slot and every undelivered order on it, atomically.
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
