# Business Plan — Town Food Delivery (Slot-Based, City Sourcing)

## 1. Concept

Aggregate food orders from town residents in fixed time slots. A rider collects batched orders from partner restaurants in the city (30 km away) and delivers them in town within a 1-hour delivery window.

**Launch strategy:** Curated menu of popular items from popular restaurants only. Goal of phase 1 is demand validation, not scale.

---

## 2. Problem & Opportunity

- Town residents want city restaurant food but won't drive 30 km (60 km round trip).
- No major delivery platform serves the town (assumed — verify).
- Festive season = high intent to order out, good launch timing.

---

## 3. Operating Model

### Slot Structure (recommended)

| Slot | Order cut-off | Rider (stationed in city) picks up | Rider leaves city | Delivery window |
|------|---------------|------------------------------------|-------------------|-----------------|
| Lunch | 11:00 AM | 11:15 AM – 12:00 PM | ~12:00 PM | 12:30 – 2:00 PM |
| Dinner | 4:30 PM | 4:45 – 5:30 PM | ~5:30 PM | 6:00 – 8:00 PM |

Rider is based in the city all day: receives the consolidated per-restaurant order list at cut-off, coordinates with restaurants directly, collects everything, then drives to town for the delivery run.

Key rule: **order cut-off, not order-to-delivery promise.** The "1 hour" is the delivery window after the rider leaves the city, not after ordering. Communicate this clearly — this is the #1 source of customer complaints if ambiguous.

**Last-mile / capacity rule:** each slot has a hard order cap (start at ~20 — what one rider can deliver within the window). When a slot fills, new orders are automatically offered the next slot with clear messaging ("Lunch full — next delivery 7:45–8:45 PM"). Never oversell a slot.

**Scale path — hub and spoke:** once slots consistently sell out, move to: city rider(s) → town hub (small rented room/kiosk) → multiple local delivery boys doing the last mile in parallel. This removes the single-rider cap and enables more slots/day. Phase 2 trigger: 2 consecutive weeks of sold-out slots.

### Order Flow

1. Customer orders on website before cut-off, pays (UPI prepaid recommended).
2. At cut-off, orders are aggregated per restaurant and sent to the city-stationed rider.
3. **Validation phase:** rider places orders as a regular customer (phone/walk-in) — no restaurant partnership needed yet.
4. **Post-partnership:** restaurants get consolidated orders in advance and commit to a ready-by time.
5. Rider picks up from all restaurants (route optimized), leaves the city.
6. In-town delivery run sequenced by area (solo, or split with a town-side helper if order count is high).

### Phase 0 — Intent Validation (before restaurant talks)

You don't need restaurant agreements to test demand. Run the first 1–2 weeks as a **concierge service**:

- Menu = public menu prices from popular restaurants (add your delivery fee on top).
- Rider buys at the counter like any customer. You earn only the delivery fee — margins are thin, but you're buying data, not profit.
- Validate: orders/slot, repeat rate, which restaurants/items sell, price sensitivity.
- THEN walk into the top 2–3 restaurants with real order numbers: "I brought you ₹X of orders last week — let's formalize with a commission and ready-by commitment." Negotiating with data >> negotiating with an idea.

Caution: clearly message that items can be unavailable/refunded, since without a partnership you can't guarantee kitchen stock.

---

## 4. Unit Economics (fill in your numbers)

Per-slot economics:

- Average order value (AOV): ₹___
- Orders per slot: ___ (Phase 1 target: 15–25/slot to break even)
- Delivery fee per order: ₹___ (suggest ₹40–80 given distance)
- Restaurant commission: ___% (negotiate 10–15%; restaurants may accept since it's incremental demand they can't reach otherwise)
- Rider cost per round trip: ₹___ (fuel ~60 km + rider payout)
- Packaging/insulated bag amortization: ₹___

**Rule:** Delivery fee + commission must exceed rider trip cost + payment gateway fees (~2%) + refund allowance. If one rider does one round trip per slot, trip cost is spread across all orders in that slot — this is why batching works and single orders don't.

Consider: **minimum orders per slot** (e.g., 8) — if not met, slot is cancelled and customers refunded automatically. Protects you from loss-making trips.

---

## 5. Restaurant Partnerships

- Shortlist 5–8 popular restaurants, 20–40 curated items total.
- Written agreement covering: commission, food-ready-by commitment at pickup time, packaging standards, complaint handling.
- Negotiate a partner discount — you bring bulk prepaid orders at off-peak-for-them timing.

---

## 6. Pricing & Payments

- **Prepaid UPI strongly recommended** for launch. COD in a batched model is dangerous: one refusal wastes delivery effort in a fixed route.
- Delivery fee: flat, shown upfront.
- Consider free delivery above ₹X to push AOV.

---

## 7. Legal / Compliance (India)

- FSSAI registration (food business operator — even as aggregator/deliverer).
- GST registration if turnover threshold applies (or plan for it).
- Liability: who owns food quality complaints? Put it in the restaurant agreement, but **you own the customer relationship** — budget a refund policy.
- Rider: vehicle insurance, and clarify employment vs gig status.

---

## 8. Phase Plan

- **Week 1 (launch):** Website, 2 slots/day, 5 restaurants, prepaid only, 1 city-stationed rider, hard cap of ~20 orders/slot with overflow to next slot.
- **Weeks 2–4:** Measure — orders/slot, repeat rate, AOV, on-time %, refund rate. Kill or fix weak restaurants. Formalize partnerships with top sellers using order data.
- **Month 2+ (if slots sell out for 2+ weeks):** Hub-and-spoke — town hub + local delivery boys, app launch, more slots, second city rider, dynamic slot capacity.
- **Later:** Scheduled pre-orders for next day, subscriptions (daily lunch), cloud kitchen in town if certain items show massive repeat demand (removes the 30 km problem entirely for top sellers).

---

## 9. Success Metrics (Phase 1)

| Metric | Target |
|---|---|
| Orders per slot | 15+ by week 2 |
| Repeat customers (order 2+ times in 2 weeks) | 30%+ |
| On-time delivery within window | 95%+ |
| Refund/complaint rate | <5% |
| Contribution margin per slot | Positive by week 2 |

Kill criteria: if after 3 weeks you're under 8 orders/slot consistently, the model or the town demand needs rethinking.
