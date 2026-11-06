// Web Push (VAPID) — free customer notifications, no Meta/SMS approval needed.
// No-op until NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY are set.

import webpush from "web-push";
import { db } from "./db";

const PUB = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.NEXT_PUBLIC_SITE_URL ?? "https://towneats-sigma.vercel.app";

if (PUB && PRIV) {
  webpush.setVapidDetails(SUBJECT, PUB, PRIV);
}

export function pushConfigured(): boolean {
  return Boolean(PUB && PRIV);
}

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  CONFIRMED: { title: "Order confirmed ✅", body: "Payment received. We're getting your food ready!" },
  PREPARING: { title: "Being prepared 👨‍🍳", body: "The restaurant is preparing your order." },
  PICKED_UP: { title: "Picked up 🛵", body: "Your order is on its way from the city." },
  OUT_FOR_DELIVERY: { title: "Out for delivery 📦", body: "The rider is in town — you'll have it shortly." },
  DELIVERED: { title: "Delivered 🎉", body: "Enjoy your meal! Reply on WhatsApp if anything was wrong." },
  CANCELLED: { title: "Order cancelled", body: "If you paid, your refund will be processed in 3–5 days." },
};

type OrderForPush = { id: string; status: string };

export async function sendOrderStatusPush(order: OrderForPush): Promise<void> {
  if (!pushConfigured()) return;
  const msg = STATUS_MESSAGES[order.status];
  if (!msg) return;

  const subs = await db.pushSubscription.findMany({ where: { orderId: order.id } });
  if (subs.length === 0) return;

  const shortId = order.id.slice(-6).toUpperCase();
  const payload = JSON.stringify({
    title: `${msg.title} · #${shortId}`,
    body: msg.body,
    url: `${SUBJECT}/order/${order.id}`,
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (e: unknown) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        // Subscription is dead — prune it.
        await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      } else {
        console.error("push failed", status, e);
      }
    }
  }
}
