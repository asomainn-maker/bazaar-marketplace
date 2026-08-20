import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import WithdrawalActions from "./withdrawal-actions";
import PhoneVerificationActions from "./phone-verification-actions";

export const revalidate = 0;

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) redirect("/dashboard");

  const { data: tickets } = await admin
    .from("tickets")
    .select("id, status, created_at, order_id, orders(amount, listings(title))")
    .order("created_at", { ascending: false });

  const { data: withdrawals } = await admin
    .from("withdrawals")
    .select("id, amount, destination, status, created_at, user_id")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const { data: pendingPhones } = await admin
    .from("profiles")
    .select("id, username, phone, phone_verification_code")
    .not("phone", "is", null)
    .eq("phone_verified", false)
    .order("created_at", { ascending: false });

  const { data: feeRows } = await admin.from("deposits").select("fee_amount").eq("status", "completed");
  const totalEarnings = (feeRows ?? []).reduce((sum, r) => sum + Number(r.fee_amount), 0);

  const { count: activeOrdersCount } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .in("status", ["paid", "delivered", "disputed"]);

  const withdrawUserIds = [...new Set((withdrawals ?? []).map((w) => w.user_id))];
  let names: Record<string, string> = {};
  if (withdrawUserIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, username").in("id", withdrawUserIds);
    names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.username]));
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-3xl mx-auto px-6 pt-8 flex items-center justify-between flex-wrap gap-3">
        <Link href="/dashboard" className="font-display text-lg">Bazar · Admin</Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/admin/users" className="rounded-full border border-line px-3 py-1.5 text-mist hover:text-paper">İstifadəçilər</Link>
          <Link href="/admin/orders" className="rounded-full border border-line px-3 py-1.5 text-mist hover:text-paper">Sifarişlər ({activeOrdersCount ?? 0})</Link>
          <Link href="/dashboard" className="text-mist hover:text-paper">Dashboard</Link>
        </nav>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="rounded-2xl border border-jade/40 bg-jade/5 p-6">
          <p className="text-xs uppercase tracking-widest text-jade mb-1">Mənim qazancım (platform komissiyası)</p>
          <p className="font-display text-3xl">${totalEarnings.toFixed(2)}</p>
        </div>

        <div>
          <h1 className="font-display text-2xl mb-5">Telefon təsdiqləri</h1>
          <div className="space-y-3">
            {(!pendingPhones || pendingPhones.length === 0) && <p className="text-sm text-mist">Gözləyən tələb yoxdur.</p>}
            {(pendingPhones ?? []).map((p) => (
              <div key={p.id} className="rounded-xl border border-line bg-panel p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium">@{p.username}</p>
                    <p className="text-xs text-mist font-mono">{p.phone}</p>
                  </div>
                  {p.phone_verification_code && (
                    <span className="text-xs text-gold font-mono">Kod: {p.phone_verification_code}</span>
                  )}
                </div>
                <PhoneVerificationActions userId={p.id} hasCode={!!p.phone_verification_code} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl mb-5">Açıq mübahisələr</h1>
          <div className="space-y-3">
            {(!tickets || tickets.filter((t) => t.status === "open").length === 0) && (
              <p className="text-sm text-mist">Açıq ticket yoxdur.</p>
            )}
            {(tickets ?? []).filter((t) => t.status === "open").map((t) => (
              <Link key={t.id} href={`/admin/tickets/${t.id}`} className="block rounded-xl border border-line bg-panel p-4 hover:border-gold transition-colors">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{(t.orders as unknown as { listings: { title: string } } | null)?.listings?.title ?? "Sifariş"}</p>
                  <span className="font-mono text-gold">
                    ${Number((t.orders as unknown as { amount: number } | null)?.amount ?? 0).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-mist mt-1">{new Date(t.created_at).toLocaleString("az")}</p>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl mb-5">Çıxarış tələbləri</h1>
          <div className="space-y-3">
            {(!withdrawals || withdrawals.length === 0) && <p className="text-sm text-mist">Gözləyən tələb yoxdur.</p>}
            {(withdrawals ?? []).map((w) => (
              <div key={w.id} className="rounded-xl border border-line bg-panel p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">@{names[w.user_id] ?? "istifadəçi"}</p>
                  <span className="font-mono text-gold">${Number(w.amount).toFixed(2)}</span>
                </div>
                <p className="text-xs text-mist mb-3">{w.destination}</p>
                <WithdrawalActions id={w.id} />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

