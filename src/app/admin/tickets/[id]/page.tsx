import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminTicketPanel from "./admin-ticket-panel";
import GeneralTicketPanel from "./general-ticket-panel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CATEGORY_LABELS: Record<string, string> = {
  report_listing: "Elanı report etmək",
  report_user: "İstifadəçini report etmək",
  feedback: "Sayt haqqında fikir/tövsiyə",
  problem_encountered: "Problemlə qarşılaşmaq",
  other: "Digər",
};

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) redirect("/dashboard");

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, status, order_id, category, listing_id, target_user_id, opened_by, orders(amount, buyer_id, seller_id, status, listings(title))")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) notFound();

  const { data: messages } = await admin
    .from("ticket_messages")
    .select("id, body, sender_id, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  // Sifarişli (mübahisə) ticket
  if (ticket.order_id) {
    const order = ticket.orders as unknown as {
      amount: number; buyer_id: string; seller_id: string; status: string; listings: { title: string } | null;
    } | null;

    const { data: names } = await admin
      .from("profiles")
      .select("id, username")
      .in("id", [order?.buyer_id, order?.seller_id].filter(Boolean) as string[]);
    const nameMap = Object.fromEntries((names ?? []).map((p) => [p.id, p.username]));

    return (
      <div className="min-h-screen">
        <header className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
          <Link href="/admin" className="font-display text-lg">İtemBazar · Admin</Link>
          <Link href="/admin" className="text-sm text-mist hover:text-paper">← Panel</Link>
        </header>
        <main className="max-w-2xl mx-auto px-6 py-12">
          <div className="rounded-2xl border border-line bg-panel p-8">
            <p className="text-xs uppercase tracking-widest text-gold mb-2">Sifariş mübahisəsi</p>
            <h1 className="font-display text-2xl mb-3">{order?.listings?.title ?? "Sifariş"}</h1>
            <div className="text-sm text-mist space-y-1 mb-6">
              <p>Məbləğ: <span className="text-jade-soft font-mono">{Number(order?.amount ?? 0).toFixed(2)} ₼</span></p>
              <p>Alıcı: @{nameMap[order?.buyer_id ?? ""] ?? "?"}</p>
              <p>Satıcı: @{nameMap[order?.seller_id ?? ""] ?? "?"}</p>
              <p>Status: {ticket.status}</p>
            </div>

            <AdminTicketPanel
              ticketId={ticket.id}
              isOpen={ticket.status === "open"}
              initialMessages={messages ?? []}
              buyerId={order?.buyer_id ?? ""}
              sellerId={order?.seller_id ?? ""}
              buyerName={nameMap[order?.buyer_id ?? ""] ?? "alıcı"}
              sellerName={nameMap[order?.seller_id ?? ""] ?? "satıcı"}
            />
          </div>
        </main>
      </div>
    );
  }

  // Ümumi (sifarişsiz) ticket: report, fikir, digər
  const { data: opener } = await admin.from("profiles").select("username").eq("id", ticket.opened_by).maybeSingle();
  let contextLabel = "";
  if (ticket.category === "report_listing" && ticket.listing_id) {
    const { data: l } = await admin.from("listings").select("title").eq("id", ticket.listing_id).maybeSingle();
    contextLabel = l?.title ? `Report edilən elan: ${l.title}` : "";
  } else if (ticket.category === "report_user" && ticket.target_user_id) {
    const { data: tu } = await admin.from("profiles").select("username").eq("id", ticket.target_user_id).maybeSingle();
    contextLabel = tu?.username ? `Report edilən istifadəçi: @${tu.username}` : "";
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/admin" className="font-display text-lg">İtemBazar · Admin</Link>
        <Link href="/admin" className="text-sm text-mist hover:text-paper">← Panel</Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-line bg-panel p-8">
          <p className="text-xs uppercase tracking-widest text-gold mb-2">
            {CATEGORY_LABELS[ticket.category ?? ""] ?? "Müraciət"}
          </p>
          <h1 className="font-display text-xl mb-2">@{opener?.username ?? "istifadəçi"}</h1>
          {contextLabel && <p className="text-sm text-jade-soft mb-4">{contextLabel}</p>}
          <p className="text-sm text-mist mb-6">Status: {ticket.status}</p>

          <GeneralTicketPanel ticketId={ticket.id} isOpen={ticket.status === "open"} initialMessages={messages ?? []} />
        </div>
      </main>
    </div>
  );
}
