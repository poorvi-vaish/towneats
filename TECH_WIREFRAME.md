# Tech Wireframe — Phase 1 Website + App Path

## 0. Honest Recommendation for a 5-Day Launch

You do NOT need a custom-built ordering platform to validate demand. Build the thinnest thing that can take orders and payments reliably:

- **Option A (fastest, 1–2 days):** Landing page (menu + slots) → order via a simple form → payment via Razorpay/PayU payment link or UPI → confirmation on WhatsApp. Ops run from a Google Sheet.
- **Option B (3–5 days):** Small custom site: static menu, cart, slot picker, checkout with payment gateway, admin page listing orders per slot. This is what the wireframe below describes — and its backend/schema carries forward to the app.

Choose A if team is non-technical or time is truly 5 days. Choose B if you can ship fast and want the app foundation.

---

## 1. Customer-Facing Pages (Website)

```
┌─────────────────────────────────────────┐
│ 1. HOME / LANDING                       │
│  - Logo, tagline: "City food, delivered │
│    to [Town] in fixed slots"            │
│  - NEXT OPEN SLOT card:                 │
│    "Lunch slot — order by 10:30 AM,     │
│     delivery 12:45–1:45 PM"             │
│    [live countdown to cut-off]          │
│  - [Order Now] button                   │
│  - How it works (3 steps graphic)       │
│  - Delivery areas list + fee            │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 2. MENU                                 │
│  - Tabs/filters by restaurant           │
│  - Item card: photo, name, price,       │
│    veg/non-veg badge, [+ Add]           │
│  - Sticky cart bar: items, total,       │
│    [Checkout]                           │
│  - Items marked unavailable if kitchen  │
│    can't do them that day (admin flag)  │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 3. CHECKOUT                             │
│  - Slot shown & locked (today's slot    │
│    if before cut-off, else next slot)   │
│  - Name, phone (OTP verify optional),   │
│    address with area dropdown (only     │
│    serviced areas selectable) +         │
│    landmark text                        │
│  - Order summary: items + delivery fee  │
│  - Payment: UPI / card (Razorpay etc.)  │
│  - No COD for launch (recommended)      │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 4. CONFIRMATION / ORDER STATUS          │
│  - Order ID, slot, delivery window      │
│  - Live status: Confirmed → Being       │
│    prepared → Picked up → Out for       │
│    delivery → Delivered                 │
│  - WhatsApp message sent with same info │
│  - Support: WhatsApp/call button        │
└─────────────────────────────────────────┘
```

Cut-off behavior: after cut-off, ordering switches to the next slot automatically with clear messaging ("Lunch slot closed — ordering for Dinner, delivery 7:45–8:45 PM").

## 2. Admin / Ops Pages (can be crude for launch)

```
┌─────────────────────────────────────────┐
│ A. SLOT DASHBOARD                       │
│  - Today's slots: order count, revenue, │
│    capacity bar (e.g., 22/30)           │
│  - [Close slot] auto at cut-off         │
│  - Per-restaurant aggregated order list │
│    → one-tap "Send to restaurant"       │
│    (WhatsApp template message)          │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ B. RIDER VIEW                           │
│  - Pickup list per restaurant (items,   │
│    order IDs)                           │
│  - Delivery list sorted by area, with   │
│    phone numbers + maps links           │
│  - [Mark picked up] / [Mark delivered]  │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ C. MENU MANAGEMENT                      │
│  - Toggle item availability             │
│  - Edit prices                          │
│  - Set slot capacity & cut-off times    │
└─────────────────────────────────────────┘
```

## 3. Data Model (as implemented)

Menu/restaurants live in `web/data/restaurants.json` (validated at build time;
edit + push to change the menu). Orders/slots live in Postgres (Neon/Supabase):

```
Slot(id, date, type[LUNCH|DINNER], cutoffAt, deliveryStart, deliveryEnd,
     capacity, minOrders, status[OPEN|FULL|CLOSED|CANCELLED|COMPLETED])
Order(id, slot_id, customer_name, phone, area, address, landmark,
      subtotal/delivery_fee/total (paise), status, payment_provider,
      payment_order_id, payment_id, idempotency_key, created_at)
OrderItem(order_id, menu_item_id (json id), restaurant_name (snapshot),
          name_snapshot, price_snapshot, qty)
```

Repo: github.com/poorvi-vaish/towneats · CI: GitHub Actions (typecheck+build on PR,
prisma db push on main) · Deploys: Vercel auto-deploy on push to main.

## 4. Key Business Rules to Encode

- Orders only accepted while `now < slot.cutoff_time` and `slot.orders < slot.capacity`.
- Slot auto-closes at cut-off; auto-cancel + auto-refund if below minimum order threshold.
- Server-side price calculation — never trust client totals.
- Payment webhook confirms order; unconfirmed payments expire in ~10 min.
- Idempotency on order creation (prevent double orders from double-tap/retry).
- Phone number validated; address restricted to serviced-area list (prevents un-deliverable orders).

## 5. Suggested Stack (keep it boring)

- **Frontend:** Next.js (or plain HTML + a little JS if speed matters more) — deploy on Vercel.
- **Backend/DB:** Supabase (Postgres + auth + storage) or Firebase — zero infra management.
- **Payments:** Razorpay (UPI-first, payment links + gateway, webhooks, auto-refunds).
- **Messaging:** WhatsApp via Twilio/Gupshup/AiSensy for confirmations + restaurant order dispatch. SMS fallback.
- **Admin:** simple protected routes in the same app, or even Retool/Appsmith on top of the DB for week 1.

## 6. App Path (post-validation)

- Reuse the same backend + data model — the app is just a new client.
- Push notifications replace WhatsApp for status updates.
- Add: saved addresses, order history, re-order, multiple slots days ahead, live rider location, COD if data justifies it, restaurant panel.
