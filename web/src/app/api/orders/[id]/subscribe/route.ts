import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const subscribeSchema = z
  .strictObject({
    endpoint: z.string().url().max(1000),
    keys: z.strictObject({
      p256dh: z.string().min(1).max(500),
      auth: z.string().min(1).max(500),
    }),
  });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || !/^[a-z0-9]{10,40}$/i.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id }, select: { id: true } });
  if (!order) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Re-subscribing the same browser endpoint just re-points it at this order.
  await db.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    update: { orderId: id, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth },
    create: {
      orderId: id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
  });
  return NextResponse.json({ ok: true });
}
