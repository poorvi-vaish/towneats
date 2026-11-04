import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { BUSINESS } from "@/lib/config";

export const metadata: Metadata = {
  title: `TownEats — City food delivered to ${BUSINESS.townName}`,
  description: `Order from the city's favourite restaurants. We pick up and deliver to ${BUSINESS.townName} in fixed lunch & dinner slots.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
