"use client";

import { useState } from "react";
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
      className={`inline-block h-3.5 w-3.5 rounded-sm border-2 ${
        isVeg ? "border-green-600" : "border-red-700"
      } relative`}
      title={isVeg ? "Veg" : "Non-veg"}
    >
      <span
        className={`absolute inset-0.5 rounded-full ${isVeg ? "bg-green-600" : "bg-red-700"}`}
      />
    </span>
  );
}

export function MenuBrowser({ restaurants }: { restaurants: RestaurantGroup[] }) {
  const [activeId, setActiveId] = useState(restaurants[0]?.id ?? "");
  const cart = useCart();
  const active = restaurants.find((r) => r.id === activeId);

  return (
    <div>
      {/* Restaurant tabs */}
      <div className="sticky top-[57px] z-30 -mx-4 overflow-x-auto bg-cream/95 px-4 py-2 backdrop-blur">
        <div className="flex gap-2">
          {restaurants.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveId(r.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                r.id === activeId
                  ? "bg-brand text-white"
                  : "border border-orange-200 bg-white text-stone-700 hover:border-brand"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-stone-500">
            {active.name} · {active.area}
          </p>
          {active.items.map((item) => {
            const inCart = cart.lines.find((l) => l.menuItemId === item.id);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-orange-100 bg-white p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <VegBadge isVeg={item.isVeg} />
                    <p className="font-bold">{item.name}</p>
                  </div>
                  {item.description ? (
                    <p className="mt-0.5 text-sm text-stone-500">{item.description}</p>
                  ) : null}
                  <p className="mt-1 font-semibold text-stone-700">{formatINR(item.pricePaise)}</p>
                </div>
                {inCart ? (
                  <div className="flex shrink-0 items-center gap-3 rounded-full bg-brand px-2 py-1 text-white">
                    <button
                      aria-label="decrease"
                      className="px-1 text-lg font-bold"
                      onClick={() => cart.setQty(item.id, inCart.qty - 1)}
                    >
                      −
                    </button>
                    <span className="min-w-4 text-center font-bold">{inCart.qty}</span>
                    <button
                      aria-label="increase"
                      className="px-1 text-lg font-bold"
                      onClick={() => cart.setQty(item.id, inCart.qty + 1)}
                    >
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
                        restaurantName: active.name,
                        isVeg: item.isVeg,
                      })
                    }
                    className="shrink-0 rounded-full border-2 border-brand px-5 py-1.5 font-bold text-brand transition hover:bg-brand hover:text-white"
                  >
                    ADD
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
