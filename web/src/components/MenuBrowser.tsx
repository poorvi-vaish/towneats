"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { formatINR } from "@/lib/config";

type Item = {
  id: string;
  name: string;
  description: string;
  pricePaise: number;
  isVeg: boolean;
};

type RestaurantGroup = {
  id: string;
  name: string;
  area: string;
  items: Item[];
};

function VegBadge({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      className={`relative inline-block h-3.5 w-3.5 rounded-sm border-2 ${
        isVeg ? "border-green-600" : "border-red-700"
      }`}
      title={isVeg ? "Veg" : "Non-veg"}
    >
      <span className={`absolute inset-0.5 rounded-full ${isVeg ? "bg-green-600" : "bg-red-700"}`} />
    </span>
  );
}

export function MenuBrowser({ restaurants }: { restaurants: RestaurantGroup[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const cart = useCart();

  // Self-heal stale carts: the menu is a JSON file and item ids change when
  // it's replaced — drop cart lines that no longer exist instead of letting
  // one dead item block the whole order at checkout.
  useEffect(() => {
    const valid = new Set(restaurants.flatMap((r) => r.items.map((i) => i.id)));
    for (const line of cart.lines) {
      if (!valid.has(line.menuItemId)) cart.remove(line.menuItemId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? restaurants.flatMap((r) =>
        r.items
          .filter((i) => i.name.toLowerCase().includes(q))
          .map((i) => ({ item: i, restaurant: r }))
      )
    : [];

  const renderItem = (item: Item, restaurantName: string, showRestaurant: boolean) => {
    const inCart = cart.lines.find((l) => l.menuItemId === item.id);
    return (
      <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <VegBadge isVeg={item.isVeg} />
            <p className="font-semibold">{item.name}</p>
          </div>
          {showRestaurant ? (
            <p className="mt-0.5 text-xs text-stone-400">{restaurantName}</p>
          ) : item.description ? (
            <p className="mt-0.5 text-sm text-stone-500">{item.description}</p>
          ) : null}
          <p className="mt-0.5 text-sm font-semibold text-stone-700">{formatINR(item.pricePaise)}</p>
        </div>
        {inCart ? (
          <div className="flex shrink-0 items-center gap-3 rounded-full bg-brand px-2 py-1 text-white">
            <button aria-label="decrease" className="px-1 text-lg font-bold" onClick={() => cart.setQty(item.id, inCart.qty - 1)}>
              −
            </button>
            <span className="min-w-4 text-center font-bold">{inCart.qty}</span>
            <button aria-label="increase" className="px-1 text-lg font-bold" onClick={() => cart.setQty(item.id, inCart.qty + 1)}>
              +
            </button>
          </div>
        ) : (
          <button
            onClick={() =>
              cart.add({
                menuItemId: item.id,
                name: item.name,
                pricePaise: item.pricePaise,
                restaurantName,
                isVeg: item.isVeg,
              })
            }
            className="shrink-0 rounded-full border-2 border-brand px-5 py-1.5 font-bold text-brand transition hover:bg-brand hover:text-white"
          >
            ADD
          </button>
        )}
      </li>
    );
  };

  return (
    <div>
      {/* Inline search across all restaurants */}
      <div className="sticky top-[57px] z-30 -mx-4 bg-cream/95 px-4 py-2 backdrop-blur">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search dishes — biryani, momos, cake…"
          className="w-full rounded-full border border-orange-200 bg-white px-4 py-2.5 outline-none focus:border-brand"
        />
      </div>

      {q ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-orange-100 bg-white">
          {results.length === 0 ? (
            <p className="p-6 text-center text-sm text-stone-500">
              No dishes match “{query}”. Try something else.
            </p>
          ) : (
            <ul className="divide-y divide-orange-50">
              {results.map(({ item, restaurant }) => renderItem(item, restaurant.name, true))}
            </ul>
          )}
        </div>
      ) : (
    <div className="space-y-3">
      {restaurants.map((r) => {
        const open = openId === r.id;
        const minPrice = Math.min(...r.items.map((i) => i.pricePaise));
        return (
          <div
            key={r.id}
            className={`overflow-hidden rounded-2xl border bg-white transition ${
              open ? "border-brand shadow-lg shadow-orange-100" : "border-orange-100"
            }`}
          >
            {/* Card header — tap to open/close */}
            <button
              onClick={() => setOpenId(open ? null : r.id)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <div>
                <p className="text-lg font-bold">{r.name}</p>
                <p className="mt-0.5 text-sm text-stone-500">
                  {r.area} · {r.items.length} items · from {formatINR(minPrice)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold transition ${
                  open ? "bg-brand text-white" : "bg-orange-50 text-brand"
                }`}
              >
                {open ? "Close ↑" : "View →"}
              </span>
            </button>

            {/* Items — visible when the card is open */}
            {open && (
              <ul className="divide-y divide-orange-50 border-t border-orange-100">
                {r.items.map((item) => renderItem(item, r.name, false))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
      )}
    </div>
  );
}
