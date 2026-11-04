"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { formatINR } from "@/lib/config";

export function CartBar() {
  const cart = useCart();
  const pathname = usePathname();

  if (cart.count === 0 || pathname.startsWith("/checkout") || pathname.startsWith("/order")) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm text-stone-500">
            {cart.count} item{cart.count > 1 ? "s" : ""}
          </p>
          <p className="font-extrabold">{formatINR(cart.subtotalPaise)}</p>
        </div>
        <Link
          href="/checkout"
          className="rounded-full bg-brand px-8 py-3 font-bold text-white shadow-lg shadow-orange-200 hover:bg-brand-dark"
        >
          Checkout →
        </Link>
      </div>
    </div>
  );
}
