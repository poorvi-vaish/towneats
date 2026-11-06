import { Header } from "@/components/Header";
import { BUSINESS } from "@/lib/config";

export const metadata = { title: "Privacy Policy — TownEats" };

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-extrabold">Privacy Policy</h1>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-stone-700">
          <h2 className="font-bold text-stone-900">What we collect</h2>
          <p>
            When you place an order we collect your name, phone number, delivery address, and order
            details. Payment information is processed by our payment partner (Razorpay) or via UPI;
            we never see or store your UPI PIN, card numbers, or banking credentials.
          </p>
          <h2 className="font-bold text-stone-900">How we use it</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To pick up and deliver your order</li>
            <li>To send order status updates (push notifications / WhatsApp, only for your orders)</li>
            <li>To contact you about problems with your order</li>
          </ul>
          <h2 className="font-bold text-stone-900">What we never do</h2>
          <p>
            We do not sell your data, share it with advertisers, or send marketing messages without
            your consent. Your data is stored on secure cloud infrastructure (Vercel and Neon).
          </p>
          <h2 className="font-bold text-stone-900">Your controls</h2>
          <p>
            Ask us any time on WhatsApp ({BUSINESS.supportPhone}) to see or delete your order
            history and personal details.
          </p>
        </div>
      </div>
    </main>
  );
}
