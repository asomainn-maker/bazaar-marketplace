import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_LABELS: Record<string, string> = {
  paid: "Ödənilib",
  delivered: "Təslim edilib",
  disputed: "Mübahisəli",
};

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) redirect("/dashboard");

  const { data: orders } = await admin
    .from("orders")
    .select("id, amount, status, created_at, buyer_id, seller_id, listings(title)")
    .in("status", ["paid", "delivered", "disputed"])
    .order("created_at", { ascending: false });

  const userIds = [...new Set((orders ?? []).flatMap((o) => [o.buyer_id, o.seller_id]))];
  let names: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, username").in("id", userIds);
    names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.username]));
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-3xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/admin" className="font-display text-lg">İtemBazar · Admin</Link>
        <Link href="/admin" className="text-sm text-mist hover:text-paper">← Panel</Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-2xl mb-6">Aktiv sifarişlər</h1>
        <div className="space-y-3">
          {(!orders || orders.length === 0) && <p className="text-sm text-mist">Aktiv sifariş yoxdur.</p>}
          {(orders ?? []).map((o) => (
            <Link key={o.id} href={`/admin/orders/${o.id}`} className="block rounded-xl border border-line bg-panel p-4 hover:border-jade transition-colors">
              <div className="flex items-center justify-between">
                <p className="font-medium">{(o.listings as unknown as { title: string } | null)?.title}</p>
                <span className="font-mono text-jade-soft">{Number(o.amount).toFixed(2)} ₼</span>
              </div>
              <p className="text-xs text-mist mt-1">
                @{names[o.buyer_id]} → @{names[o.seller_id]} · {STATUS_LABELS[o.status] ?? o.status}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
