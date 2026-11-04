import { Header } from "@/components/Header";
import { MenuBrowser } from "@/components/MenuBrowser";
import { CartBar } from "@/components/CartBar";
import { Countdown } from "@/components/Countdown";
import { getSlotBoard } from "@/lib/slots";
import { activeRestaurants } from "@/lib/menu";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const { current, next } = await getSlotBoard();
  const slot = current ?? next;
  const restaurants = activeRestaurants();

  return (
    <main className="min-h-screen pb-24">
      <Header />
      <div className="mx-auto max-w-3xl px-4 pt-4">
        {slot ? (
          <div className="mb-4 rounded-2xl border border-orange-100 bg-white p-4">
            <p className="text-sm text-stone-600">
              Ordering for the <span className="font-bold text-stone-900">{slot.label} slot</span> —
              delivery <span className="font-bold text-stone-900">{slot.deliveryWindow}</span>
            </p>
            <p className="mt-0.5 text-sm text-stone-600">
              Order within <Countdown targetIso={slot.cutoffAt} /> · {slot.spotsLeft} spots left
            </p>
          </div>
        ) : (
          <div className="mb-4 rounded-2xl border border-orange-100 bg-white p-4 text-sm text-stone-600">
            No open slots right now — you can browse the menu, and ordering opens for the next slot
            tomorrow.
          </div>
        )}
        <MenuBrowser
          restaurants={restaurants.map((r) => ({
            id: r.id,
            name: r.name,
            area: r.area,
            items: r.items
              .filter((m) => m.available)
              .map((m) => ({
                id: m.id,
                name: m.name,
                description: m.description,
                pricePaise: m.pricePaise,
                isVeg: m.isVeg,
              })),
          }))}
        />
      </div>
      <CartBar />
    </main>
  );
}
