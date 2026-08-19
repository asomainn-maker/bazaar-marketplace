import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 0;

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

  return (
    <div className="min-h-screen">
      <header className="max-w-4xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="font-display text-lg">Bazar</Link>
        <Link href="/" className="text-sm text-mist hover:text-paper">← Bazara qayıt</Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-line bg-panel p-8 mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display text-3xl mb-1">@{profile.username}</h1>
              {profile.is_verified_seller && (
                <span className="inline-block rounded-full bg-jade/10 text-jade text-xs px-3 py-1">✓ Doğrulanmış satıcı</span>
              )}
            </div>
            <div className="flex gap-8 text-center">
              <div>
                <p className="font-display text-2xl">{completedSales ?? 0}</p>
                <p className="text-xs text-mist">Uğurlu satış</p>
              </div>
              <div>
                <p className="font-display text-2xl text-gold">
                  {avgRating !== null ? avgRating.toFixed(1) : "—"}
                </p>
                <p className="text-xs text-mist">{reviews?.length ?? 0} rəy</p>
              </div>
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
                  <span className="font-mono text-jade-soft">${Number(l.price).toFixed(2)}</span>
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
