import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OrderActions from "./order-actions";

export const revalidate = 0;

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, buyer_id, seller_id, amount, status, delivered_at, auto_release_at, listings(title)")
    .eq("id", id)
    .maybeSingle();

  if (!order || (order.buyer_id !== user.id && order.seller_id !== user.id)) notFound();

  const isBuyer = order.buyer_id === user.id;

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, status")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .maybeSingle();

  const { data: existingReview } = isBuyer
    ? await admin.from("reviews").select("id, rating, body").eq("order_id", order.id).maybeSingle()
    : { data: null };

  return (
    <div className="min-h-screen">
      <header className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/dashboard" className="font-display text-lg">Bazar</Link>
        <Link href="/dashboard" className="text-sm text-mist hover:text-paper">← Dashboard</Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-line bg-panel p-8">
          <p className="text-xs uppercase tracking-widest text-gold mb-2">{isBuyer ? "Alışım" : "Satışım"}</p>
          <h1 className="font-display text-2xl mb-1">
            {(order.listings as unknown as { title: string } | null)?.title}
          </h1>
          <p className="font-mono text-jade-soft text-lg mb-6">${Number(order.amount).toFixed(2)}</p>

          <OrderActions
            orderId={order.id}
            status={order.status}
            isBuyer={isBuyer}
            autoReleaseAt={order.auto_release_at}
            ticketId={ticket?.id ?? null}
            ticketStatus={ticket?.status ?? null}
            existingReview={existingReview}
          />
        </div>
      </main>
    </div>
  );
}
