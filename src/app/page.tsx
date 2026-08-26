import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import HomeLogoutButton from "./home-logout-button";
import NotificationBell from "./notification-bell";
import { Suspense } from "react";
import SearchBar from "./search-bar";
import FilterBar from "./filter-bar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; min?: string; max?: string; page?: string }>;
}) {
  const { q, category, sort, min, max, page } = await searchParams;
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: categories } = await admin.from("categories").select("id, slug, name").order("sort_order");

  const { count: totalUsers } = await admin.from("profiles").select("*", { count: "exact", head: true });
  const { count: totalSales } = await admin.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed");
  const { count: totalListings } = await admin.from("listings").select("*", { count: "exact", head: true }).eq("status", "active");

  const PAGE_SIZE = 24;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = admin
    .from("listings")
    .select("id, title, price, image_url, created_at, seller_id, is_auto_delivery, categories(name, slug)", { count: "exact" })
    .eq("status", "active");

  if (q) query = query.ilike("title", `%${q}%`);
  if (category) {
    const cat = (categories ?? []).find((c) => c.slug === category);
    if (cat) query = query.eq("category_id", cat.id);
  }
  if (min) query = query.gte("price", Number(min));
  if (max) query = query.lte("price", Number(max));

  type ListingRow = {
    id: string; title: string; price: number; image_url: string | null;
    created_at: string; seller_id: string; is_auto_delivery: boolean; categories: unknown;
  };

  let listings: ListingRow[] = [];
  let count = 0;

  if (sort === "top_sales" || sort === "top_rated") {
    // Bu sıralamalar satıcı statistikasına əsaslanır, DB-level order dəstəklənmir — JS-də sıralayırıq.
    const { data: allMatching } = await query.limit(300);
    const rows = (allMatching ?? []) as ListingRow[];
    const sellerIds = [...new Set(rows.map((l) => l.seller_id))];

    let salesBySeller: Record<string, number> = {};
    let ratingBySeller: Record<string, number> = {};
    if (sellerIds.length > 0) {
      const { data: orderRows } = await admin
        .from("orders").select("seller_id").eq("status", "completed").in("seller_id", sellerIds);
      salesBySeller = (orderRows ?? []).reduce<Record<string, number>>((acc, o) => {
        acc[o.seller_id] = (acc[o.seller_id] ?? 0) + 1;
        return acc;
      }, {});

      const { data: reviewRows } = await admin
        .from("reviews").select("reviewee_id, rating").in("reviewee_id", sellerIds);
      const grouped: Record<string, number[]> = {};
      (reviewRows ?? []).forEach((r) => {
        grouped[r.reviewee_id] = grouped[r.reviewee_id] ?? [];
        grouped[r.reviewee_id].push(r.rating);
      });
      ratingBySeller = Object.fromEntries(
        Object.entries(grouped).map(([id, ratings]) => [id, ratings.reduce((a, b) => a + b, 0) / ratings.length])
      );
    }

    rows.sort((a, b) => {
      if (sort === "top_sales") return (salesBySeller[b.seller_id] ?? 0) - (salesBySeller[a.seller_id] ?? 0);
      return (ratingBySeller[b.seller_id] ?? 0) - (ratingBySeller[a.seller_id] ?? 0);
    });

    count = rows.length;
    listings = rows.slice(from, to + 1);
  } else {
    if (sort === "price_asc") query = query.order("price", { ascending: true });
    else if (sort === "price_desc") query = query.order("price", { ascending: false });
    else if (sort === "oldest") query = query.order("created_at", { ascending: true });
    else query = query.order("created_at", { ascending: false });

    const result = await query.range(from, to);
    listings = (result.data ?? []) as ListingRow[];
    count = result.count ?? 0;
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (category) baseParams.set("category", category);
  if (sort) baseParams.set("sort", sort);
  if (min) baseParams.set("min", min);
  if (max) baseParams.set("max", max);

  const sellerIds = [...new Set((listings ?? []).map((l) => l.seller_id))];
  let sellerNames: Record<string, string> = {};
  if (sellerIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, username").in("id", sellerIds);
    sellerNames = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.username]));
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="max-w-6xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between gap-6">
          <Link href="/" className="font-display text-xl tracking-tight shrink-0">İtemBazar</Link>

          <div className="flex-1 max-w-xl hidden sm:block">
            <SearchBar initialQuery={q ?? ""} />
          </div>

          <nav className="flex items-center gap-4 text-sm shrink-0">
            {user ? (
              <>
                <NotificationBell />
                <Link href="/dashboard" className="rounded-full bg-jade text-bg px-4 py-2 font-medium">Dashboard</Link>
                <HomeLogoutButton />
              </>
            ) : (
              <>
                <Link href="/login" className="text-mist hover:text-paper">Giriş</Link>
                <Link href="/signup" className="rounded-full bg-jade text-bg px-4 py-2 font-medium">Qeydiyyat</Link>
              </>
            )}
          </nav>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-4 flex gap-2 overflow-x-auto">
          <Link
            href="/"
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs border transition-colors ${!category ? "bg-jade text-bg border-jade" : "border-line text-mist hover:text-paper"}`}
          >
            Hamısı
          </Link>
          {(categories ?? []).map((c) => (
            <Link
              key={c.id}
              href={`/?category=${c.slug}`}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs border transition-colors ${category === c.slug ? "bg-jade text-bg border-jade" : "border-line text-mist hover:text-paper"}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {!q && !category && (
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[.25em] text-gold mb-3">Etibarlı P2P bazar</p>
            <h1 className="font-display text-4xl md:text-5xl mb-3 max-w-2xl">
              Ödədiyiniz pul siz təsdiqləyənə qədər qorunur.
            </h1>
            <p className="text-mist max-w-xl mb-6">Problem olarsa, dəstək komandası araya girir və kimin haqlı olduğuna qərar verir.</p>
            <div className="flex flex-wrap gap-6 text-sm">
              <div><span className="font-display text-xl text-jade-soft">{totalUsers ?? 0}+</span> <span className="text-mist">istifadəçi</span></div>
              <div><span className="font-display text-xl text-jade-soft">{totalSales ?? 0}+</span> <span className="text-mist">tamamlanmış satış</span></div>
              <div><span className="font-display text-xl text-jade-soft">{totalListings ?? 0}+</span> <span className="text-mist">aktiv elan</span></div>
            </div>
          </div>
        )}

        <Suspense fallback={<div className="h-10" />}>
          <FilterBar sort={sort ?? ""} min={min ?? ""} max={max ?? ""} />
        </Suspense>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-6">
          {(listings ?? []).length === 0 && (
            <p className="text-mist col-span-full text-center py-16 border border-dashed border-line rounded-2xl">
              Heç bir nəticə tapılmadı.
            </p>
          )}
          {(listings ?? []).map((l) => (
            <Link
              key={l.id}
              href={`/listings/${l.id}`}
              className="rounded-2xl border border-line bg-panel overflow-hidden hover:border-jade transition-colors group"
            >
              <div className="aspect-[4/3] bg-bg overflow-hidden">
                {l.image_url ? (
                  <img src={l.image_url} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-mist text-3xl font-display">
                    {l.title.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase tracking-widest text-mist">
                    {(l.categories as unknown as { name: string } | null)?.name ?? "Digər"}
                  </p>
                  {l.is_auto_delivery && <span className="text-[10px] text-jade">⚡ Avtomatik</span>}
                </div>
                <p className="font-display text-base mb-1 truncate">{l.title}</p>
                <p className="text-xs text-mist mb-3">@{sellerNames[l.seller_id] ?? "satıcı"}</p>
                <p className="font-mono text-jade-soft text-lg">{Number(l.price).toFixed(2)} ₼</p>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {totalPages > 1 && (
        <div className="max-w-6xl mx-auto px-6 pb-10 flex items-center justify-center gap-3 text-sm">
          {currentPage > 1 && (
            <a href={`/?${(() => { const p = new URLSearchParams(baseParams); p.set("page", String(currentPage - 1)); return p.toString(); })()}`} className="rounded-full border border-line px-4 py-2 hover:border-jade">← Əvvəlki</a>
          )}
          <span className="text-mist">{currentPage} / {totalPages}</span>
          {currentPage < totalPages && (
            <a href={`/?${(() => { const p = new URLSearchParams(baseParams); p.set("page", String(currentPage + 1)); return p.toString(); })()}`} className="rounded-full border border-line px-4 py-2 hover:border-jade">Növbəti →</a>
          )}
        </div>
      )}

      <footer className="border-t border-line mt-10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-mist">
          <span>© 2026 Bazar</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-paper">İstifadə şərtləri</Link>
            <Link href="/privacy" className="hover:text-paper">Məxfilik siyasəti</Link>
            <Link href="/dashboard/support" className="hover:text-paper">Dəstək</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
