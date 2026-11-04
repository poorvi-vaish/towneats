"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = {
  menuItemId: string;
  name: string;
  pricePaise: number;
  restaurantName: string;
  isVeg: boolean;
  qty: number;
};

type CartContextType = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "qty">) => void;
  remove: (menuItemId: string) => void;
  setQty: (menuItemId: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotalPaise: number;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "towneats_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // corrupted cart — start fresh
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const value = useMemo<CartContextType>(() => {
    const add = (line: Omit<CartLine, "qty">) =>
      setLines((prev) => {
        const existing = prev.find((l) => l.menuItemId === line.menuItemId);
        if (existing) {
          return prev.map((l) =>
            l.menuItemId === line.menuItemId ? { ...l, qty: Math.min(l.qty + 1, 10) } : l
          );
        }
        return [...prev, { ...line, qty: 1 }];
      });
    const remove = (id: string) => setLines((prev) => prev.filter((l) => l.menuItemId !== id));
    const setQty = (id: string, qty: number) =>
      setLines((prev) =>
        qty <= 0
          ? prev.filter((l) => l.menuItemId !== id)
          : prev.map((l) => (l.menuItemId === id ? { ...l, qty: Math.min(qty, 10) } : l))
      );
    const clear = () => setLines([]);
    return {
      lines,
      add,
      remove,
      setQty,
      clear,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotalPaise: lines.reduce((n, l) => n + l.pricePaise * l.qty, 0),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
