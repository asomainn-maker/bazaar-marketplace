import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminOrderActions from "./admin-order-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) redirect("/dashboard");

  const { data: order } = await admin
    .from("orders")
    .select("id, amount, status, buyer_id, seller_id, listing_id, listings(title)")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const { data: names } = await admin.from("profiles").select("id, username").in("id", [order.buyer_id, order.seller_id]);
  const nameMap = Object.fromEntries((names ?? []).map((p) => [p.id, p.username]));

  const { data: conversation } = await admin
    .from("conversations")
    .select("id")
    .eq("buyer_id", order.buyer_id)
    .eq("seller_id", order.seller_id)
    .eq("listing_id", order.listing_id)
    .maybeSingle();

  let messages: { id: string; body: string; sender_id: string }[] = [];
  if (conversation) {
    const { data: msgs } = await admin
      .from("direct_messages")
      .select("id, body, sender_id")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });
    messages = msgs ?? [];
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/admin/orders" className="font-display text-lg">Bazar · Admin</Link>
        <Link href="/admin/orders" className="text-sm text-mist hover:text-paper">← Sifarişlər</Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-line bg-panel p-8">
          <h1 className="font-display text-2xl mb-1">{(order.listings as unknown as { title: string } | null)?.title}</h1>
          <p className="font-mono text-jade-soft text-lg mb-4">${Number(order.amount).toFixed(2)}</p>
          <div className="text-sm text-mist space-y-1 mb-6">
            <p>Alıcı: @{nameMap[order.buyer_id] ?? "?"}</p>
            <p>Satıcı: @{nameMap[order.seller_id] ?? "?"}</p>
            <p>Status: {order.status}</p>
          </div>

          {conversation && (
            <div className="rounded-xl border border-line bg-bg/40 p-4 mb-6 max-h-72 overflow-y-auto space-y-2">
              <p className="text-xs uppercase tracking-widest text-gold mb-2">Alıcı-satıcı söhbəti</p>
              {messages.length === 0 && <p className="text-sm text-mist">Söhbət hələ boşdur.</p>}
              {messages.map((m) => (
                <div key={m.id} className="text-sm border-b border-line pb-2 last:border-0">
                  <p className="text-xs text-jade-soft mb-0.5">
                    {m.sender_id === order.buyer_id ? `@${nameMap[order.buyer_id]} (alıcı)` : `@${nameMap[order.seller_id]} (satıcı)`}
                  </p>
                  <p className="text-paper/90">{m.body}</p>
                </div>
              ))}
            </div>
          )}

          <AdminOrderActions orderId={order.id} />
        </div>
      </main>
    </div>
  );
}
