import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function levelInfo(sales: number) {
  if (sales >= 100) return { label: "Platinum satıcı", color: "text-violet-soft" };
  if (sales >= 50) return { label: "Qızıl satıcı", color: "text-gold" };
  if (sales >= 20) return { label: "Gümüş satıcı", color: "text-mist" };
  if (sales >= 5) return { label: "Bürünc satıcı", color: "text-amber-400" };
  return { label: "Yeni satıcı", color: "text-mist" };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, username, is_verified_seller, created_at")
    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

  const { data: listings } = await admin
    .from("listings")
    .select("id, title, price, status, image_url")
    .eq("seller_id", profile.id)
    .order("created_at", { ascending: false });

  const activeCount = (listings ?? []).filter((l) => l.status === "active").length;

  const { count: completedSales } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", profile.id)
    .eq("status", "completed");

  const { data: reviews } = await admin
    .from("reviews")
    .select("rating, body, created_at, reviewer_id")
    .eq("reviewee_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  const level = levelInfo(completedSales ?? 0);
  const memberSince = new Date(profile.created_at).toLocaleDateString("az", { year: "numeric", month: "long" });

  return (
    <div className="min-h-screen">
      <header className="max-w-4xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="font-display text-lg">İtemBazar</Link>
        <Link href="/" className="text-sm text-mist hover:text-paper">← Bazara qayıt</Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Banner */}
        <div className="h-28 rounded-t-2xl bg-gradient-to-r from-jade/20 via-violet-soft/10 to-gold/20 border border-b-0 border-line" />

        <div className="rounded-b-2xl border border-line bg-panel p-8 mb-8">
          <div className="flex items-start gap-5 flex-wrap -mt-16">
            <div className="w-24 h-24 rounded-2xl bg-bg border-4 border-panel flex items-center justify-center font-display text-3xl shrink-0">
              {profile.username.slice(0, 1).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0 pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl">@{profile.username}</h1>
                {profile.is_verified_seller && (
                  <span className="rounded-full bg-jade/10 text-jade text-[10px] px-2 py-1">✓ Doğrulanmış</span>
                )}
              </div>
              <p className={`text-sm font-medium ${level.color}`}>{level.label}</p>
              <p className="text-xs text-mist mt-1">Üzvlük: {memberSince}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-line text-center">
            <div>
              <p className="font-display text-xl">{completedSales ?? 0}</p>
              <p className="text-[11px] text-mist">Uğurlu satış</p>
            </div>
            <div>
              <p className="font-display text-xl text-gold">{avgRating !== null ? avgRating.toFixed(1) : "—"}</p>
              <p className="text-[11px] text-mist">{reviews?.length ?? 0} rəy</p>
            </div>
            <div>
              <p className="font-display text-xl">{activeCount}</p>
              <p className="text-[11px] text-mist">Aktiv elan</p>
            </div>
            <div className="hidden sm:block">
              <p className="font-display text-xl">{listings?.length ?? 0}</p>
              <p className="text-[11px] text-mist">Cəmi elan</p>
            </div>
          </div>
        </div>

        <h2 className="font-display text-xl mb-4">Elanlar</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 mb-10">
          {(!listings || listings.length === 0) && <p className="text-sm text-mist">Hələ elan yoxdur.</p>}
          {(listings ?? []).map((l) => (
            <Link
              key={l.id}
              href={`/listings/${l.id}`}
              className="rounded-2xl border border-line bg-panel overflow-hidden hover:border-jade transition-colors"
            >
              <div className="aspect-[4/3] bg-bg overflow-hidden">
                {l.image_url ? (
                  <img src={l.image_url} alt={l.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-mist text-2xl font-display">
                    {l.title.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="font-display text-sm truncate mb-1">{l.title}</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-jade-soft">{Number(l.price).toFixed(2)} ₼</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${l.status === "active" ? "bg-jade/10 text-jade" : "bg-line text-mist"}`}>
                    {l.status === "active" ? "Aktiv" : "Satılıb"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <h2 className="font-display text-xl mb-4">Rəylər</h2>
        <div className="space-y-3">
          {(!reviews || reviews.length === 0) && <p className="text-sm text-mist">Hələ rəy yoxdur.</p>}
          {(reviews ?? []).map((r, i) => (
            <div key={i} className="rounded-xl border border-line bg-panel p-4">
              <p className="text-gold text-sm mb-1">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
              {r.body && <p className="text-sm text-paper/90">{r.body}</p>}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
