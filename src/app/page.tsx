import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function Home() {
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: listings } = await admin
    .from("listings")
    .select("id, title, price, created_at, seller_id, categories(name)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(40);

  const sellerIds = [...new Set((listings ?? []).map((l) => l.seller_id))];
  let sellerNames: Record<string, string> = {};
  if (sellerIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, username").in("id", sellerIds);
    sellerNames = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.username]));
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-6xl mx-auto px-6 pt-8 flex items-center justify-between">
        <span className="font-display text-lg tracking-tight">Bazar</span>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <Link href="/dashboard" className="rounded-full bg-jade text-bg px-4 py-2 font-medium">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="text-mist hover:text-paper">Giriş</Link>
              <Link href="/signup" className="rounded-full bg-jade text-bg px-4 py-2 font-medium">Qeydiyyat</Link>
            </>
          )}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <p className="text-xs uppercase tracking-[.25em] text-gold mb-3">Etibarlı P2P bazar</p>
        <h1 className="font-display text-4xl md:text-5xl mb-4 max-w-2xl">
          Rəqəmsal məhsullar üçün təhlükəsiz alqı-satqı.
        </h1>
        <p className="text-mist max-w-xl mb-10">
          Ödənişiniz siz təsdiqləyənə qədər qorunur. Problem olarsa, dəstək komandası araya girir.
        </p>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {(listings ?? []).length === 0 && (
            <p className="text-mist col-span-full text-center py-12 border border-dashed border-line rounded-2xl">
              Hələ elan yoxdur.
            </p>
          )}
          {(listings ?? []).map((l) => (
            <Link
              key={l.id}
              href={`/listings/${l.id}`}
              className="rounded-2xl border border-line bg-panel p-5 hover:border-jade transition-colors"
            >
              <p className="text-[10px] uppercase tracking-widest text-mist mb-2">
                {(l.categories as unknown as { name: string } | null)?.name ?? "Digər"}
              </p>
              <p className="font-display text-lg mb-1 truncate">{l.title}</p>
              <p className="text-xs text-mist mb-4">@{sellerNames[l.seller_id] ?? "satıcı"}</p>
              <p className="font-mono text-jade-soft text-lg">${Number(l.price).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
