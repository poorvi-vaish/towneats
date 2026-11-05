import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { BUSINESS } from "@/lib/config";
import { assertSlotAccepting, SlotError } from "@/lib/slots";
import { getOrderableItems } from "@/lib/menu";
import { razorpayClient, razorpayConfigured } from "@/lib/razorpay";

// Strict schema: unknown fields are rejected.
const createOrderSchema = z
  .strictObject({
    slotId: z.string().min(1).max(64),
    customerName: z.string().trim().min(2).max(60),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
    area: z.string().trim().min(2).max(60),
    address: z.string().trim().min(5).max(200),
    landmark: z.string().trim().max(120).optional().default(""),
    idempotencyKey: z.uuid(),
    items: z
      .array(z.strictObject({ menuItemId: z.string().min(1).max(64), qty: z.number().int().min(1).max(10) }))
      .min(1)
      .max(30),
  });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your order details and try again." }, { status: 400 });
  }
  const input = parsed.data;

  if (!BUSINESS.servicedAreas.includes(input.area)) {
    return NextResponse.json({ error: "Sorry, we don't deliver to this area yet." }, { status: 400 });
  }

  // Idempotency: a retried submission returns the original order.
  const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    return NextResponse.json(orderResponse(existing));
  }

  try {
    const order = await db.$transaction(async (tx) => {
      await assertSlotAccepting(input.slotId, tx);

      // Server-side pricing from the JSON menu: never trust client totals.
      const menuIds = [...new Set(input.items.map((i) => i.menuItemId))];
      const menuItems = getOrderableItems(menuIds);
      if (!menuItems) {
        throw new SlotError("Some items are no longer available. Please review your cart.");
      }

      const subtotal = input.items.reduce((sum, i) => sum + menuItems.get(i.menuItemId)!.item.pricePaise * i.qty, 0);
      if (subtotal <= 0) throw new SlotError("Your cart appears to be empty.");

      const total = subtotal + BUSINESS.deliveryFeePaise;

      return tx.order.create({
        data: {
          slotId: input.slotId,
          customerName: input.customerName,
          phone: input.phone,
          area: input.area,
          address: input.address,
          landmark: input.landmark ?? "",
          subtotalPaise: subtotal,
          deliveryFeePaise: BUSINESS.deliveryFeePaise,
          totalPaise: total,
          paymentProvider: razorpayConfigured() ? "razorpay" : "manual_upi",
          idempotencyKey: input.idempotencyKey,
          items: {
            create: input.items.map((i) => {
              const entry = menuItems.get(i.menuItemId)!;
              return {
                menuItemId: i.menuItemId,
                restaurantName: entry.restaurant.name,
                nameSnapshot: entry.item.name,
                pricePaiseSnap: entry.item.pricePaise,
                qty: i.qty,
              };
            }),
          },
        },
      });
    });

    // Create the Razorpay order outside the DB transaction (network call).
    if (razorpayConfigured()) {
      const rzp = razorpayClient();
      const rzpOrder = await rzp.orders.create({
        amount: order.totalPaise,
        currency: "INR",
        receipt: order.id,
      });
      await db.order.update({ where: { id: order.id }, data: { paymentOrderId: rzpOrder.id } });
      return NextResponse.json({
        ...orderResponse(order),
        razorpay: {
          keyId: process.env.RAZORPAY_KEY_ID,
          orderId: rzpOrder.id,
          amountPaise: order.totalPaise,
        },
      });
    }

    // Manual UPI mode: customer pays to our UPI ID, admin confirms payment.
    return NextResponse.json({
      ...orderResponse(order),
      manualUpi: { upiId: process.env.MANUAL_UPI_ID ?? "", amountPaise: order.totalPaise },
    });
  } catch (e) {
    if (e instanceof SlotError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error("order creation failed", e);
    return NextResponse.json({ error: "Something went wrong placing your order. Please try again." }, { status: 500 });
  }
}

function orderResponse(order: { id: string; totalPaise: number; status: string }) {
  return { orderId: order.id, totalPaise: order.totalPaise, status: order.status };
}
