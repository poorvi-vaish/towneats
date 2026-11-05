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

type OrderForNotify = {
  id: string;
  customerName: string;
  phone: string;
  area: string;
  totalPaise: number;
  slot: { date: string; type: string };
  items: Array<{ nameSnapshot: string; qty: number }>;
};

export async function notifyNewOrderWhatsApp(order: OrderForNotify): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.WHATSAPP_NOTIFY_TO;
  if (!sid || !token || !from || !to) return;

  const text = [
    `🍽️ *New order #${order.id.slice(-6).toUpperCase()}* — ₹${(order.totalPaise / 100).toFixed(0)}`,
    `${order.customerName} · ${order.phone}`,
    `📍 ${order.area}`,
    order.items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(", "),
    `Slot: ${order.slot.type === "LUNCH" ? "Lunch" : "Dinner"} ${order.slot.date}`,
  ].join("\n");

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: text }),
    });
    if (!res.ok) {
      // Never let a notification failure affect the order flow.
      console.error("whatsapp notify failed", res.status, await res.text());
    }
  } catch (e) {
    console.error("whatsapp notify failed", e);
  }
}
