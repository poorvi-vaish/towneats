import { db } from "./db";
import type { Prisma, Slot, SlotType } from "@prisma/client";

type Db = Prisma.TransactionClient | typeof db;

// All slot times are built with an explicit +05:30 offset so behaviour is
// identical no matter where the server is hosted.
const IST = "+05:30";

const SLOT_SCHEDULE: Array<{
  type: SlotType;
  cutoff: string; // HH:MM IST
  deliveryStart: string;
  deliveryEnd: string;
  capacity: number;
  minOrders: number;
}> = [
  { type: "LUNCH", cutoff: "11:30", deliveryStart: "12:30", deliveryEnd: "14:00", capacity: 20, minOrders: 8 },
  { type: "DINNER", cutoff: "17:30", deliveryStart: "18:00", deliveryEnd: "20:00", capacity: 20, minOrders: 8 },
];

function istDateString(d: Date): string {
  // yyyy-mm-dd in Asia/Kolkata
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function atIST(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm}:00${IST}`);
}

/** Create slots for today and tomorrow, and sync times of existing future
 *  slots to the current schedule (so schedule edits take effect without a
 *  manual data migration). */
export async function ensureSlots(): Promise<void> {
  const now = new Date();
  const dates = [istDateString(now), istDateString(new Date(now.getTime() + 86400000))];

  for (const date of dates) {
    for (const s of SLOT_SCHEDULE) {
      await db.slot.upsert({
        where: { date_type: { date, type: s.type } },
        update: {
          cutoffAt: atIST(date, s.cutoff),
          deliveryStart: atIST(date, s.deliveryStart),
          deliveryEnd: atIST(date, s.deliveryEnd),
        },
        create: {
          date,
          type: s.type,
          cutoffAt: atIST(date, s.cutoff),
          deliveryStart: atIST(date, s.deliveryStart),
          deliveryEnd: atIST(date, s.deliveryEnd),
          capacity: s.capacity,
          minOrders: s.minOrders,
        },
      });
    }
  }
}

function fmtTime(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export type SlotView = {
  id: string;
  type: SlotType;
  label: string; // "Lunch" / "Dinner"
  date: string;
  cutoffAt: string;
  cutoffLabel: string; // "11:30 am"
  deliveryWindow: string; // "12:45 PM – 1:45 PM"
  capacity: number;
  taken: number; // confirmed + pending orders
  spotsLeft: number;
  isOpen: boolean; // accepting orders right now
  reason: string | null; // why not open
};

function toView(slot: Slot, taken: number, now: Date): SlotView {
  const pastCutoff = now >= slot.cutoffAt;
  const full = taken >= slot.capacity;
  const isOpen = slot.status === "OPEN" && !pastCutoff && !full;
  return {
    id: slot.id,
    type: slot.type,
    label: slot.type === "LUNCH" ? "Lunch" : "Dinner",
    date: slot.date,
    cutoffAt: slot.cutoffAt.toISOString(),
    cutoffLabel: fmtTime(slot.cutoffAt),
    deliveryWindow: `${fmtTime(slot.deliveryStart)} – ${fmtTime(slot.deliveryEnd)}`,
    capacity: slot.capacity,
    taken,
    spotsLeft: Math.max(0, slot.capacity - taken),
    isOpen,
    reason: isOpen
      ? null
      : full
        ? "Slot full"
        : pastCutoff
          ? "Order cut-off passed"
          : "Slot not open",
  };
}

/** Unpaid orders hold a spot briefly, then free it up. Manual-UPI customers
 *  get longer — paying from a bank app is slower than a checkout popup, and
 *  cancelling someone who already paid is the worst failure mode. */
export async function releaseStalePending(client: Db = db): Promise<void> {
  const now = Date.now();
  await client.order.updateMany({
    where: {
      status: "PENDING_PAYMENT",
      OR: [
        { paymentProvider: "razorpay", createdAt: { lt: new Date(now - 15 * 60 * 1000) } },
        { paymentProvider: "manual_upi", createdAt: { lt: new Date(now - 45 * 60 * 1000) } },
      ],
    },
    data: { status: "CANCELLED" },
  });
}

/** The slot a new order would go into, plus what's coming next.
 *  Three queries total: create-missing-slots, release-stale, fetch-with-counts. */
export async function getSlotBoard(): Promise<{ current: SlotView | null; next: SlotView | null }> {
  await ensureSlots();
  await releaseStalePending();
  const now = new Date();
  const slots = await db.slot.findMany({
    where: { cutoffAt: { gte: new Date(now.getTime() - 6 * 3600000) }, status: { not: "CANCELLED" } },
    orderBy: { cutoffAt: "asc" },
    take: 6,
    include: {
      _count: {
        select: { orders: { where: { status: { notIn: ["CANCELLED", "REFUNDED"] } } } },
      },
    },
  });
  const views = slots.map((s) => toView(s, s._count.orders, now));

  const current = views.find((v) => v.isOpen) ?? null;
  const next = current ? (views.find((v) => v.id !== current.id && new Date(v.cutoffAt) > now) ?? null) : (views[0] ?? null);
  return { current, next };
}

/** Server-side guard used by the order API. Throws with a user-safe message.
 *  Pass the transaction client when called inside a transaction. */
export async function assertSlotAccepting(slotId: string, client: Db = db): Promise<Slot> {
  // Lock the slot row so concurrent orders can't both pass the capacity
  // check (count-then-insert race). Serializes order placement per slot.
  await client.$executeRaw`SELECT id FROM "Slot" WHERE id = ${slotId} FOR UPDATE`;

  const slot = await client.slot.findUnique({ where: { id: slotId } });
  if (!slot) throw new SlotError("This delivery slot no longer exists.");
  const now = new Date();
  if (slot.status !== "OPEN") throw new SlotError("This slot is not accepting orders.");
  if (now >= slot.cutoffAt) throw new SlotError("The cut-off for this slot has passed. Please order for the next slot.");

  await releaseStalePending(client);
  const taken = await client.order.count({
    where: { slotId, status: { notIn: ["CANCELLED", "REFUNDED"] } },
  });
  if (taken >= slot.capacity) {
    throw new SlotError("This slot just filled up. Please try the next slot.");
  }
  return slot;
}

export class SlotError extends Error {}
