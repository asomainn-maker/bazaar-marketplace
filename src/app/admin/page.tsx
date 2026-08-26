import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import WithdrawalActions from "./withdrawal-actions";
import PhoneVerificationActions from "./phone-verification-actions";

export const dynamic = "force-dynamic";
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
    .select("id, status, created_at, order_id, category, orders(amount, listings(title))")
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

  // Statistika: son 7 gün ərzində gündəlik yeni istifadəçi + satış həcmi
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentProfiles } = await admin.from("profiles").select("created_at").gte("created_at", sevenDaysAgo);
  const { data: recentOrders } = await admin.from("orders").select("created_at, amount").eq("status", "completed").gte("created_at", sevenDaysAgo);

  const dayLabels: string[] = [];
  const newUsersByDay: number[] = [];
  const salesByDay: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayLabels.push(d.toLocaleDateString("az", { day: "2-digit", month: "2-digit" }));
    newUsersByDay.push((recentProfiles ?? []).filter((p) => p.created_at.startsWith(key)).length);
    salesByDay.push(
      (recentOrders ?? []).filter((o) => o.created_at.startsWith(key)).reduce((sum, o) => sum + Number(o.amount), 0)
    );
  }

  const { count: totalUsers } = await admin.from("profiles").select("*", { count: "exact", head: true });
  const { count: totalCompletedSales } = await admin.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed");
  const totalEarnings = (feeRows ?? []).reduce((sum, r) => sum + Number(r.fee_amount), 0);

  const { count: activeOrdersCount } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .in("status", ["paid", "delivered", "disputed"]);

  const { count: openReportsCount } = await admin
    .from("listing_reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "open");

  const withdrawUserIds = [...new Set((withdrawals ?? []).map((w) => w.user_id))];
  let names: Record<string, string> = {};
  if (withdrawUserIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, username").in("id", withdrawUserIds);
    names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.username]));
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-3xl mx-auto px-6 pt-8 flex items-center justify-between flex-wrap gap-3">
        <Link href="/dashboard" className="font-display text-lg">İtemBazar · Admin</Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/admin/users" className="rounded-full border border-line px-3 py-1.5 text-mist hover:text-paper">İstifadəçilər</Link>
          <Link href="/admin/orders" className="rounded-full border border-line px-3 py-1.5 text-mist hover:text-paper">Sifarişlər ({activeOrdersCount ?? 0})</Link>
          <Link href="/admin/reports" className="rounded-full border border-line px-3 py-1.5 text-mist hover:text-paper">Report-lar ({openReportsCount ?? 0})</Link>
          <Link href="/dashboard" className="text-mist hover:text-paper">Dashboard</Link>
        </nav>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-jade/40 bg-jade/5 p-6">
            <p className="text-xs uppercase tracking-widest text-jade mb-1">Qazancım</p>
            <p className="font-display text-2xl">{totalEarnings.toFixed(2)} ₼</p>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-6">
            <p className="text-xs uppercase tracking-widest text-mist mb-1">Cəmi istifadəçi</p>
            <p className="font-display text-2xl">{totalUsers ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-6">
            <p className="text-xs uppercase tracking-widest text-mist mb-1">Tamamlanmış satış</p>
            <p className="font-display text-2xl">{totalCompletedSales ?? 0}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-6">
          <p className="text-xs uppercase tracking-widest text-mist mb-4">Son 7 gün</p>
          <div className="grid grid-cols-7 gap-2">
            {dayLabels.map((label, i) => {
              const maxUsers = Math.max(...newUsersByDay, 1);
              const maxSales = Math.max(...salesByDay, 1);
              return (
                <div key={i} className="text-center">
                  <div className="h-20 flex flex-col justify-end gap-0.5 mb-1">
                    <div className="w-full bg-gold/60 rounded-t" style={{ height: `${(salesByDay[i] / maxSales) * 100}%`, minHeight: salesByDay[i] > 0 ? "3px" : "0" }} title={`Satış: ${salesByDay[i].toFixed(2)} ₼`} />
                    <div className="w-full bg-jade/60 rounded-t" style={{ height: `${(newUsersByDay[i] / maxUsers) * 100}%`, minHeight: newUsersByDay[i] > 0 ? "3px" : "0" }} title={`Yeni istifadəçi: ${newUsersByDay[i]}`} />
                  </div>
                  <p className="text-[10px] text-mist">{label}</p>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 text-[11px] text-mist">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-jade/60" /> Yeni istifadəçi</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gold/60" /> Satış həcmi (₼)</span>
          </div>
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
          <h1 className="font-display text-2xl mb-5">Açıq müraciətlər (mübahisə + report + digər)</h1>
          <div className="space-y-3">
            {(!tickets || tickets.filter((t) => t.status === "open").length === 0) && (
              <p className="text-sm text-mist">Açıq ticket yoxdur.</p>
            )}
            {(tickets ?? []).filter((t) => t.status === "open").map((t) => {
              const CATEGORY_LABELS: Record<string, string> = {
                report_listing: "Elan report",
                report_user: "İstifadəçi report",
                feedback: "Fikir/tövsiyə",
                problem_encountered: "Problem",
                other: "Digər",
              };
              const isOrderTicket = !!t.order_id;
              const title = isOrderTicket
                ? (t.orders as unknown as { listings: { title: string } } | null)?.listings?.title ?? "Sifariş"
                : CATEGORY_LABELS[t.category ?? ""] ?? "Müraciət";
              return (
                <Link key={t.id} href={`/admin/tickets/${t.id}`} className="block rounded-xl border border-line bg-panel p-4 hover:border-gold transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{title}</p>
                    {isOrderTicket ? (
                      <span className="font-mono text-gold">
                        ${Number((t.orders as unknown as { amount: number } | null)?.amount ?? 0).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest text-mist">
                        {isOrderTicket ? "" : "Ümumi"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-mist mt-1">{new Date(t.created_at).toLocaleString("az")}</p>
                </Link>
              );
            })}
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
                  <span className="font-mono text-gold">{Number(w.amount).toFixed(2)} ₼</span>
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

