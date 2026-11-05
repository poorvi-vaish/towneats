import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-orange-100 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" aria-label="TownEats home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.svg" alt="TownEats" className="h-8 w-auto" />
        </Link>
        <Link
          href="/menu"
          className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Order Now
        </Link>
      </div>
    </header>
  );
}
