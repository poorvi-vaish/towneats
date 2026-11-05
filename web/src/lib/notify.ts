// WhatsApp ops notifications via Twilio's WhatsApp API (sandbox-friendly).
// No SDK — plain REST call. If the env vars are absent, notifications are
// a silent no-op so the app works identically before setup.
//
// Setup (10 min, free):
//   1. twilio.com → trial account
//   2. Console → Messaging → WhatsApp sandbox → from YOUR WhatsApp, send the
//      join code shown (e.g. "join happy-tiger") to the Twilio sandbox number
//   3. Set env vars (Vercel + .env):
//        TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
//        TWILIO_WHATSAPP_FROM  = whatsapp:+14155238886   (sandbox number)
//        WHATSAPP_NOTIFY_TO    = whatsapp:+91<support number>
// Production note: outside the sandbox, WhatsApp requires approved message
// templates (Meta Cloud API or Twilio templates) — revisit when volume justifies.

// ---------------------------------------------------------------------------
// Customer-facing notifications: Meta WhatsApp Cloud API (production path).
// No-op until META_WHATSAPP_TOKEN + META_WHATSAPP_PHONE_NUMBER_ID are set.
// Templates (create in Meta Business Suite → WhatsApp → Message templates,
// category UTILITY, language English — names must match exactly):
//
//   order_confirmed        "Namaste {{1}}! Your TownEats order #{{2}} of ₹{{3}} is confirmed for the {{4}} slot (delivery {{5}}). Track it here: {{6}}"
//   order_out_for_delivery "Your TownEats order #{{1}} is out for delivery 🛵 It will reach you within the slot window."
//   order_delivered        "Your TownEats order #{{1}} has been delivered. Enjoy your meal! 🎉 Reply here if anything was wrong."
//   order_refund           "Your TownEats order #{{1}} was cancelled. Refund of ₹{{2}} will be processed to your payment method within 3-5 days."
// ---------------------------------------------------------------------------

const META_TOKEN = process.env.META_WHATSAPP_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://towneats-sigma.vercel.app";

function fmtIST(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

async function sendCustomerTemplate(toPhone10: string, template: string, params: string[]): Promise<void> {
  if (!META_TOKEN || !META_PHONE_NUMBER_ID) return; // not configured — no-op
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${META_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: `91${toPhone10}`,
        type: "template",
        template: {
          name: template,
          language: { code: "en" },
          components: [
            { type: "body", parameters: params.map((text) => ({ type: "text", text })) },
          ],
        },
      }),
    });
    if (!res.ok) {
      // Notifications must never break order flow.
      console.error("meta whatsapp failed", template, res.status, await res.text());
    }
  } catch (e) {
    console.error("meta whatsapp failed", template, e);
  }
}

export async function notifyCustomerOrderConfirmed(order: OrderForNotify & { slot: { deliveryStart: Date; deliveryEnd: Date } }): Promise<void> {
  await sendCustomerTemplate(order.phone, "order_confirmed", [
    order.customerName.split(" ")[0],
    order.id.slice(-6).toUpperCase(),
    (order.totalPaise / 100).toFixed(0),
    order.slot.type === "LUNCH" ? "Lunch" : "Dinner",
    `${fmtIST(order.slot.deliveryStart)} – ${fmtIST(order.slot.deliveryEnd)}`,
    `${SITE_URL}/order/${order.id}`,
  ]);
}

export async function notifyCustomerOutForDelivery(order: OrderForNotify): Promise<void> {
  await sendCustomerTemplate(order.phone, "order_out_for_delivery", [order.id.slice(-6).toUpperCase()]);
}

export async function notifyCustomerDelivered(order: OrderForNotify): Promise<void> {
  await sendCustomerTemplate(order.phone, "order_delivered", [order.id.slice(-6).toUpperCase()]);
}

export async function notifyCustomerRefund(order: OrderForNotify): Promise<void> {
  await sendCustomerTemplate(order.phone, "order_refund", [
    order.id.slice(-6).toUpperCase(),
    (order.totalPaise / 100).toFixed(0),
  ]);
}

type OrderForNotify = {
  id: string;
  customerName: string;
  phone: string;
  area: string;
  totalPaise: number;
  slot: { date: string; type: string };
  items: Array<{ nameSnapshot: string; qty: number }>;
};

// Twilio sandbox notes (per Twilio docs):
//  - Free-form Body messages work while a 24h customer-service window is
//    open — the window opens whenever your number sends ANY message to the
//    sandbox number (joining counts). If it lapses, error 21654 is returned.
//  - Pre-approved stock templates (ContentSid) work any time; get the "order
//    notification" template's SID from Try out WhatsApp → Send a message.
//  - Sandbox sessions expire 3 days after joining — re-join with the code.
// Strategy: free-form first (nicer formatting); on 21654, fall back to the
// stock template if TWILIO_CONTENT_SID is configured.

export async function notifyNewOrderWhatsApp(order: OrderForNotify): Promise<void> {
  return sendOpsWhatsApp(order, "TownEats ✅ PAID");
}

/** Manual UPI: customer tapped "I've paid" — ops must verify the credit in
 *  the bank app before marking the order paid. */
export async function notifyPaymentClaimedWhatsApp(order: OrderForNotify): Promise<void> {
  return sendOpsWhatsApp(order, "TownEats ⚠️ VERIFY PAYMENT");
}

/** Customer cancelled a paid order — ops owes a refund. */
export async function notifyOrderCancelledWhatsApp(order: OrderForNotify): Promise<void> {
  return sendOpsWhatsApp(order, "TownEats ❌ CANCELLED — REFUND DUE");
}

async function sendOpsWhatsApp(order: OrderForNotify, headline: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.WHATSAPP_NOTIFY_TO;
  if (!sid || !token || !from || !to) return;

  const amount = `₹${(order.totalPaise / 100).toFixed(0)}`;
  const items = order.items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(", ");
  const slot = `${order.slot.type === "LUNCH" ? "Lunch" : "Dinner"} slot ${order.slot.date}`;
  const details = `#${order.id.slice(-6).toUpperCase()} · ${order.customerName} · ${order.phone} · ${order.area}`;

  const freeform = [headline, `${details} — ${amount}`, items, slot].join("\n");

  try {
    // Attempt 1: free-form (works inside the 24h window)
    const res = await twilioSend(sid, token, { From: from, To: to, Body: freeform });
    if (res.ok) return;

    const errBody = await res.text();
    const windowExpired = errBody.includes('"code":21654');
    const contentSid = process.env.TWILIO_CONTENT_SID;

    if (windowExpired && contentSid) {
      // Attempt 2: stock template fallback
      const res2 = await twilioSend(sid, token, {
        From: from,
        To: to,
        ContentSid: contentSid,
        ContentVariables: JSON.stringify({ "1": headline, "2": `${amount} — ${items}`, "3": slot, "4": details }),
      });
      if (!res2.ok) console.error("whatsapp template notify failed", res2.status, await res2.text());
      return;
    }
    if (windowExpired) {
      console.error(
        "whatsapp notify failed: 24h sandbox window expired. Send any WhatsApp message from your number to the sandbox number to reopen it, or set TWILIO_CONTENT_SID."
      );
      return;
    }
    console.error("whatsapp notify failed", res.status, errBody);
  } catch (e) {
    console.error("whatsapp notify failed", e);
  }
}

function twilioSend(sid: string, token: string, params: Record<string, string>): Promise<Response> {
  return fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
}
