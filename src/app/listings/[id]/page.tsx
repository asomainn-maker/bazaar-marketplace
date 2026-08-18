import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import BuyButton from "./buy-button";

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
    .select("id, title, description, price, status, seller_id, created_at, image_url, categories(name)")
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

          <div className="flex items-center gap-2 mb-6 text-sm">
            <span className="text-mist">Satıcı:</span>
            <span className="text-jade-soft">@{seller?.username ?? "naməlum"}</span>
            {seller?.is_verified_seller && (
              <span className="rounded-full bg-jade/10 text-jade text-[10px] px-2 py-0.5">✓ Doğrulanmış</span>
            )}
            <span className="text-mist">· {salesCount ?? 0} satış</span>
          </div>

          {listing.description && (
            <p className="text-paper/90 leading-relaxed mb-6 whitespace-pre-wrap">{listing.description}</p>
          )}

          <div className="flex items-center justify-between border-t border-line pt-6">
            <span className="font-mono text-2xl text-jade-soft">${Number(listing.price).toFixed(2)}</span>
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

        <div className="mt-6 rounded-2xl border border-line p-6 text-sm text-mist">
          <h2 className="text-paper font-display text-base mb-2">Necə qorunursunuz?</h2>
          <p>Ödədiyiniz məbləğ dərhal satıcıya getmir. Siz məhsulu aldığınızı təsdiqləyəndən sonra pul satıcıya keçir. Problem olarsa, dəstək sistemi üzərindən mübahisə aça bilərsiniz.</p>
        </div>
      </main>
    </div>
  );
}
