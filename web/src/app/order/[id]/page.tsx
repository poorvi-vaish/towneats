import { Header } from "@/components/Header";
import { OrderTracker } from "@/components/OrderTracker";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { id } = await params;
  const { placed } = await searchParams;

  // Validate id shape before it ever touches the DB layer.
  // Full cuid, or the 6-char short id from the tracking card.
  if (!/^[a-z0-9]{6,40}$/i.test(id)) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-xl px-4 pt-10 text-center text-stone-500">Order not found.</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-10">
      <Header />
      <div className="mx-auto max-w-xl px-4 pt-6">
        <h1 className="mb-4 text-2xl font-extrabold">Track your order</h1>
        <OrderTracker orderId={id} justPlaced={placed === "1"} />
      </div>
    </main>
  );
}
