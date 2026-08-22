import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ReportActions from "./report-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) redirect("/dashboard");

  const { data: reports } = await admin
    .from("listing_reports")
    .select("id, reason, created_at, listing_id, reporter_id, listings(title, status)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const reporterIds = [...new Set((reports ?? []).map((r) => r.reporter_id))];
  let names: Record<string, string> = {};
  if (reporterIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, username").in("id", reporterIds);
    names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.username]));
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-3xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/admin" className="font-display text-lg">İtemBazar · Admin</Link>
        <Link href="/admin" className="text-sm text-mist hover:text-paper">← Panel</Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-2xl mb-6">Elan report-ları</h1>
        <div className="space-y-3">
          {(!reports || reports.length === 0) && <p className="text-sm text-mist">Açıq report yoxdur.</p>}
          {(reports ?? []).map((r) => {
            const listing = r.listings as unknown as { title: string; status: string } | null;
            return (
              <div key={r.id} className="rounded-xl border border-line bg-panel p-4">
                <div className="flex items-center justify-between mb-2">
                  <Link href={`/listings/${r.listing_id}`} className="font-medium hover:underline">
                    {listing?.title ?? "Silinmiş elan"}
                  </Link>
                  <span className="text-xs text-mist">@{names[r.reporter_id] ?? "istifadəçi"}</span>
                </div>
                <p className="text-sm text-paper/90 mb-3">{r.reason}</p>
                <ReportActions reportId={r.id} listingId={r.listing_id} isRemoved={listing?.status === "removed"} />
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
