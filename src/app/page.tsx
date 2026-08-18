import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: categories } = await admin.from("categories").select("id, slug, name").order("sort_order");

  let query = admin
    .from("listings")
    .select("id, title, price, image_url, created_at, seller_id, categories(name, slug)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60);

  if (q) query = query.ilike("title", `%${q}%`);
  if (category) {
    const cat = (categories ?? []).find((c) => c.slug === category);
    if (cat) query = query.eq("category_id", cat.id);
  }

  const { data: listings } = await query;

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
          <Link href="/" className="font-display text-xl tracking-tight shrink-0">Bazar</Link>

          <form action="/" className="flex-1 max-w-xl hidden sm:block">
            <input
              name="q" defaultValue={q ?? ""} placeholder="Nə axtarırsınız?"
              className="w-full rounded-full border border-line bg-panel px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
            />
          </form>

          <nav className="flex items-center gap-4 text-sm shrink-0">
            {user ? (
              <Link href="/dashboard" className="rounded-full bg-jade text-bg px-4 py-2 font-medium">Dashboard</Link>
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
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[.25em] text-gold mb-3">Etibarlı P2P bazar</p>
            <h1 className="font-display text-4xl md:text-5xl mb-3 max-w-2xl">
              Ödədiyiniz pul siz təsdiqləyənə qədər qorunur.
            </h1>
            <p className="text-mist max-w-xl">Problem olarsa, dəstək komandası araya girir və kimin haqlı olduğuna qərar verir.</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
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
                <p className="text-[10px] uppercase tracking-widest text-mist mb-1">
                  {(l.categories as unknown as { name: string } | null)?.name ?? "Digər"}
                </p>
                <p className="font-display text-base mb-1 truncate">{l.title}</p>
                <p className="text-xs text-mist mb-3">@{sellerNames[l.seller_id] ?? "satıcı"}</p>
                <p className="font-mono text-jade-soft text-lg">${Number(l.price).toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
