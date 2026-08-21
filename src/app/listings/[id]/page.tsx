import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import BuyButton from "./buy-button";
import ListingTabs from "./listing-tabs";
import MessageSellerButton from "./message-seller-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: listing } = await admin
    .from("listings")
    .select("id, title, description, price, status, seller_id, created_at, image_url, categories(name, slug)")
    .eq("id", id)
    .maybeSingle();

  if (!listing) notFound();

  const { data: seller } = await admin
    .from("profiles")
    .select("username, is_verified_seller")
    .eq("id", listing.seller_id)
    .maybeSingle();

  const { count: salesCount } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", listing.seller_id)
    .eq("status", "completed");

  const { data: reviews } = await admin
    .from("reviews")
    .select("rating, body, created_at, reviewer_id")
    .eq("reviewee_id", listing.seller_id)
    .order("created_at", { ascending: false })
    .limit(10);

  const reviewerIds = [...new Set((reviews ?? []).map((r) => r.reviewer_id))];
  let reviewerNames: Record<string, string> = {};
  if (reviewerIds.length > 0) {
    const { data: rp } = await admin.from("profiles").select("id, username").in("id", reviewerIds);
    reviewerNames = Object.fromEntries((rp ?? []).map((p) => [p.id, p.username]));
  }

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

  const { data: questions } = await admin
    .from("listing_questions")
    .select("id, question, answer, asker_id, created_at")
    .eq("listing_id", id)
    .order("created_at", { ascending: false });

  const askerIds = [...new Set((questions ?? []).map((q) => q.asker_id))];
  let askerNames: Record<string, string> = {};
  if (askerIds.length > 0) {
    const { data: ap } = await admin.from("profiles").select("id, username").in("id", askerIds);
    askerNames = Object.fromEntries((ap ?? []).map((p) => [p.id, p.username]));
  }

  const { data: otherListings } = await admin
    .from("listings")
    .select("id, title, price, image_url")
    .eq("seller_id", listing.seller_id)
    .eq("status", "active")
    .neq("id", id)
    .limit(4);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isOwnListing = user?.id === listing.seller_id;

  return (
    <div className="min-h-screen">
      <header className="max-w-3xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/" className="font-display text-lg">Bazar</Link>
        <Link href="/" className="text-sm text-mist hover:text-paper">← Bazara qayıt</Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-line bg-panel overflow-hidden">
          {listing.image_url && (
            <div className="aspect-[16/9] bg-bg overflow-hidden">
              <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-8">
          <p className="text-[10px] uppercase tracking-widest text-mist mb-2">
            {(listing.categories as unknown as { name: string } | null)?.name ?? "Digər"}
          </p>
          <h1 className="font-display text-3xl mb-3">{listing.title}</h1>

          <div className="flex items-center gap-2 mb-6 text-sm flex-wrap">
            <span className="text-mist">Satıcı:</span>
            <Link href={`/u/${seller?.username}`} className="text-jade-soft hover:underline">@{seller?.username ?? "naməlum"}</Link>
            {seller?.is_verified_seller && (
              <span className="rounded-full bg-jade/10 text-jade text-[10px] px-2 py-0.5">✓ Doğrulanmış</span>
            )}
            <span className="text-mist">· {salesCount ?? 0} satış</span>
            {avgRating !== null && <span className="text-gold">· ★ {avgRating.toFixed(1)}</span>}
          </div>

          <div className="flex items-center justify-between border-t border-line pt-6">
            <span className="font-mono text-2xl text-jade-soft">${Number(listing.price).toFixed(2)}</span>
            <div className="flex items-center gap-2">
              {!isOwnListing && user && <MessageSellerButton sellerId={listing.seller_id} listingId={listing.id} />}
              {listing.status !== "active" ? (
                <span className="text-sm text-mist">Bu elan artıq satılıb</span>
              ) : isOwnListing ? (
                <span className="text-sm text-mist">Bu sizin elanınızdır</span>
              ) : user ? (
                <BuyButton listingId={listing.id} price={Number(listing.price)} />
              ) : (
                <Link href="/login" className="rounded-full bg-jade text-bg px-6 py-3 text-sm font-semibold">
                  Almaq üçün giriş edin
                </Link>
              )}
            </div>
          </div>
          </div>
        </div>

        <div className="mt-6">
          <ListingTabs
            listingId={listing.id}
            description={listing.description}
            reviews={(reviews ?? []).map((r) => ({ ...r, username: reviewerNames[r.reviewer_id] ?? "istifadəçi" }))}
            questions={(questions ?? []).map((q) => ({ ...q, username: askerNames[q.asker_id] ?? "istifadəçi" }))}
            isLoggedIn={!!user}
            isOwner={isOwnListing}
          />
        </div>

        {(otherListings ?? []).length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-lg mb-4">Satıcının digər elanları</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {(otherListings ?? []).map((l) => (
                <Link key={l.id} href={`/listings/${l.id}`} className="rounded-xl border border-line bg-panel overflow-hidden hover:border-jade transition-colors flex">
                  <div className="w-20 h-20 shrink-0 bg-bg overflow-hidden">
                    {l.image_url ? (
                      <img src={l.image_url} alt={l.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-mist">{l.title.slice(0,1).toUpperCase()}</div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col justify-center min-w-0">
                    <p className="text-sm truncate">{l.title}</p>
                    <p className="font-mono text-jade-soft text-sm">${Number(l.price).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
