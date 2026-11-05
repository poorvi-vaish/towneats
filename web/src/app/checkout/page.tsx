import { Header } from "@/components/Header";
import { CheckoutForm } from "@/components/CheckoutForm";
import { getSlotBoard } from "@/lib/slots";
import { BUSINESS } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const { current, next } = await getSlotBoard();
  const slot = current ?? next;

  return (
    <main className="min-h-screen pb-10">
      <Header />
      <div className="mx-auto max-w-xl px-4 pt-6">
        <h1 className="text-2xl font-extrabold">Checkout</h1>
        {slot ? (
          <div className="mt-3 rounded-2xl border border-orange-100 bg-white p-4 text-sm">
            <p>
              <span className="font-bold">{slot.label} slot</span> · delivery{" "}
              <span className="font-bold">{slot.deliveryWindow}</span>
            </p>
            <p className="mt-0.5 text-stone-500">
              {slot.isOpen
                ? `${slot.spotsLeft} spots left — complete payment to lock your order.`
                : "This is a pre-order for the next slot."}
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-orange-100 bg-white p-4 text-sm text-stone-600">
            No slots available right now. Please come back tomorrow.
          </div>
        )}
        {slot && (
          <CheckoutForm
            slotId={slot.id}
            areas={BUSINESS.servicedAreas}
            deliveryFeePaise={BUSINESS.deliveryFeePaise}
            minOrderPaise={BUSINESS.minOrderPaise}
          />
        )}
      </div>
    </main>
  );
}
