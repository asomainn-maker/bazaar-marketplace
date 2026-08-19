import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProfile } from "@/lib/profile-utils";
import LogoutButton from "./logout-button";
import NotificationBell from "../notification-bell";

export const revalidate = 0;

const STATUS_LABELS: Record<string, string> = {
  paid: "Ödənilib · gözlənilir",
  delivered: "Təslim edilib · təsdiq gözlənilir",
  completed: "Tamamlanıb",
  disputed: "Mübahisəli",
  refunded: "Geri qaytarılıb",
  cancelled: "Ləğv edilib",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const profile = await ensureProfile(admin, user.id, user.email ?? "user");

  const { data: phoneProfile } = await admin
    .from("profiles")
    .select("phone, phone_verified")
    .eq("id", user.id)
    .maybeSingle();

  const { data: myListings } = await admin
    .from("listings")
    .select("id, title, price, status, created_at")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const { data: purchases } = await admin
    .from("orders")
    .select("id, amount, status, created_at, listings(title)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  const { data: sales } = await admin
    .from("orders")
    .select("id, amount, status, created_at, listings(title)")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <header className="max-w-4xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="font-display text-lg flex items-center gap-2"><span className="text-mist">←</span> Bazar</Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/u/${profile.username}`} className="text-jade-soft hover:underline">@{profile.username}</Link>
          <NotificationBell />
          <Link href="/dashboard/messages" className="rounded-full border border-line px-3 py-1.5 text-mist hover:text-paper">Mesajlar</Link>
          {profile.is_admin && (
            <Link href="/admin" className="rounded-full border border-line px-3 py-1.5 text-mist hover:text-paper">Admin</Link>
          )}
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="rounded-2xl border border-line bg-panel p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-mist mb-1">Balans</p>
            <p className="font-display text-3xl">${Number(profile.wallet_balance).toFixed(2)}</p>
          </div>
          <Link href="/dashboard/wallet" className="rounded-full bg-jade text-bg px-5 py-2.5 text-sm font-semibold">
            Cüzdan idarəsi
          </Link>
        </div>

        {phoneProfile?.phone_verified ? (
          <div className="rounded-2xl border border-line bg-panel p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-jade mb-1">✓ Telefon təsdiqlənib</p>
              <p className="font-mono text-sm">{phoneProfile.phone}</p>
            </div>
            <Link href="/dashboard/verify-phone" className="rounded-full border border-line px-4 py-2 text-sm text-mist hover:text-paper">
              Nömrəni dəyiş
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-gold mb-1">
                {phoneProfile?.phone ? "Təsdiq gözlənilir" : "Doğrulanmayıb"}
              </p>
              <p className="text-sm text-mist">
                {phoneProfile?.phone
                  ? "Nömrəniz admin təsdiqini gözləyir."
                  : "Elan yerləşdirmək üçün telefon nömrənizi doğrulayın."}
              </p>
            </div>
            <Link href="/dashboard/verify-phone" className="rounded-full bg-gold text-bg px-4 py-2 text-sm font-semibold">
              Nömrə doğrula
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Mənim elanlarım</h2>
          <Link href="/dashboard/new-listing" className="rounded-full bg-gold text-bg px-4 py-2 text-sm font-semibold">+ Yeni elan</Link>
        </div>
        <div className="space-y-3">
          {(!myListings || myListings.length === 0) && (
            <p className="text-sm text-mist border border-dashed border-line rounded-2xl p-6 text-center">Hələ elan yerləşdirməmisiniz.</p>
          )}
          {(myListings ?? []).map((l) => (
            <div key={l.id} className="rounded-xl border border-line bg-panel p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{l.title}</p>
                <p className="text-xs text-mist">{l.status === "active" ? "Aktiv" : l.status === "sold" ? "Satılıb" : "Silinib"}</p>
              </div>
              <span className="font-mono text-jade-soft">${Number(l.price).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <h2 className="font-display text-xl">Satışlarım</h2>
        <div className="space-y-3">
          {(!sales || sales.length === 0) && <p className="text-sm text-mist">Hələ satışınız yoxdur.</p>}
          {(sales ?? []).map((o) => (
            <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="block rounded-xl border border-line bg-panel p-4 hover:border-jade transition-colors">
              <div className="flex items-center justify-between">
                <p className="font-medium">{(o.listings as unknown as { title: string } | null)?.title}</p>
                <span className="font-mono text-jade-soft">${Number(o.amount).toFixed(2)}</span>
              </div>
              <p className="text-xs text-mist mt-1">{STATUS_LABELS[o.status] ?? o.status}</p>
            </Link>
          ))}
        </div>

        <h2 className="font-display text-xl">Alışlarım</h2>
        <div className="space-y-3">
          {(!purchases || purchases.length === 0) && <p className="text-sm text-mist">Hələ alışınız yoxdur.</p>}
          {(purchases ?? []).map((o) => (
            <Link key={o.id} href={`/dashboard/orders/${o.id}`} className="block rounded-xl border border-line bg-panel p-4 hover:border-jade transition-colors">
              <div className="flex items-center justify-between">
                <p className="font-medium">{(o.listings as unknown as { title: string } | null)?.title}</p>
                <span className="font-mono text-jade-soft">${Number(o.amount).toFixed(2)}</span>
              </div>
              <p className="text-xs text-mist mt-1">{STATUS_LABELS[o.status] ?? o.status}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
