"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Ticket = { id: string; status: string; category: string | null; subject: string; created_at: string };
type ListingHit = { id: string; title: string; price: number; status: string };
type UserHit = { id: string; username: string };
type MyOrder = { id: string; title: string; amount: number; status: string };

const CATEGORIES = [
  { key: "report_listing", label: "Bir elanı report etmək" },
  { key: "report_user", label: "Bir istifadəçini report etmək" },
  { key: "feedback", label: "Sayt haqqında fikir/tövsiyə" },
  { key: "buy_problem", label: "Elan alanda problem yaşamaq" },
  { key: "problem_encountered", label: "Problemlə qarşılaşmaq" },
  { key: "other", label: "Digər" },
];

const STATUS_LABELS: Record<string, string> = {
  open: "Açıqdır · cavab gözlənilir",
  resolved_buyer: "Həll olunub",
  resolved_seller: "Həll olunub",
  closed: "Bağlanıb",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // report_listing
  const [listingQuery, setListingQuery] = useState("");
  const [listingHits, setListingHits] = useState<ListingHit[]>([]);
  const [selectedListing, setSelectedListing] = useState<ListingHit | null>(null);

  // report_user
  const [userQuery, setUserQuery] = useState("");
  const [userHits, setUserHits] = useState<UserHit[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserHit | null>(null);

  // buy_problem
  const [myOrders, setMyOrders] = useState<MyOrder[] | null>(null);

  function loadTickets() {
    fetch("/api/support/tickets").then((r) => r.json()).then((d) => setTickets(d.tickets ?? []));
  }
  useEffect(() => { loadTickets(); }, []);

  useEffect(() => {
    if (category === "buy_problem" && myOrders === null) {
      fetch("/api/orders/mine").then((r) => r.json()).then((d) => setMyOrders(d.orders ?? []));
    }
  }, [category, myOrders]);

  useEffect(() => {
    if (listingQuery.trim().length < 2) { setListingHits([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/listings/search-any?q=${encodeURIComponent(listingQuery.trim())}`)
        .then((r) => r.json()).then((d) => setListingHits(d.listings ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [listingQuery]);

  useEffect(() => {
    if (userQuery.trim().length < 2) { setUserHits([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(userQuery.trim())}`)
        .then((r) => r.json()).then((d) => setUserHits(d.users ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [userQuery]);

  function resetFlow() {
    setCategory(null); setMessage(""); setError(null);
    setListingQuery(""); setListingHits([]); setSelectedListing(null);
    setUserQuery(""); setUserHits([]); setSelectedUser(null);
  }

  async function selectOrderForProblem(order: MyOrder) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/orders/${order.id}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() || "Problem yaşadım." }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Xəta baş verdi"); return; }
    router.push(`/dashboard/orders/${order.id}`);
  }

  async function submitGeneric(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    if (category === "report_listing" && !selectedListing) { setError("Elan seçin"); return; }
    if (category === "report_user" && !selectedUser) { setError("İstifadəçi seçin"); return; }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        message,
        listingId: selectedListing?.id,
        targetUserId: selectedUser?.id,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Göndərilmədi"); return; }
    resetFlow();
    loadTickets();
    router.push(`/dashboard/support/${data.ticketId}`);
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/dashboard" className="font-display text-lg flex items-center gap-2"><span className="text-mist">←</span> İtemBazar</Link>
        <Link href="/dashboard" className="text-sm text-mist hover:text-paper">Dashboard</Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[.25em] text-gold mb-2">Yardım mərkəzi</p>
          <h1 className="font-display text-2xl">Dəstək</h1>
          <p className="text-sm text-mist mt-2">Hansı problemlə üzləşdiyinizi seçin.</p>
        </div>

        {!category && (
          <div className="grid sm:grid-cols-2 gap-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className="rounded-xl border border-line bg-panel p-4 text-left text-sm hover:border-jade transition-colors"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {category && (
          <div className="rounded-2xl border border-line bg-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg">{CATEGORIES.find((c) => c.key === category)?.label}</h2>
              <button onClick={resetFlow} className="text-xs text-mist hover:text-paper">← Kateqoriyaya qayıt</button>
            </div>

            {category === "report_listing" && !selectedListing && (
              <div>
                <input
                  value={listingQuery} onChange={(e) => setListingQuery(e.target.value)} placeholder="Elan adı ilə axtarın…"
                  className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
                />
                <div className="mt-2 space-y-1">
                  {listingHits.map((l) => (
                    <button key={l.id} onClick={() => setSelectedListing(l)} className="w-full flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm hover:border-jade">
                      <span className="truncate">{l.title}</span>
                      <span className="text-jade-soft font-mono text-xs">{Number(l.price).toFixed(2)} ₼</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {category === "report_listing" && selectedListing && (
              <div className="flex items-center justify-between rounded-lg border border-jade/40 bg-jade/5 px-3 py-2 text-sm">
                <span>{selectedListing.title}</span>
                <button onClick={() => setSelectedListing(null)} className="text-xs text-mist">Dəyiş</button>
              </div>
            )}

            {category === "report_user" && !selectedUser && (
              <div>
                <input
                  value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="İstifadəçi adı yazın…"
                  className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
                />
                <div className="mt-2 space-y-1">
                  {userHits.map((u) => (
                    <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full text-left rounded-lg border border-line px-3 py-2 text-sm hover:border-jade">
                      @{u.username}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {category === "report_user" && selectedUser && (
              <div className="flex items-center justify-between rounded-lg border border-jade/40 bg-jade/5 px-3 py-2 text-sm">
                <span>@{selectedUser.username}</span>
                <button onClick={() => setSelectedUser(null)} className="text-xs text-mist">Dəyiş</button>
              </div>
            )}

            {category === "buy_problem" && (
              <div>
                {myOrders === null && <p className="text-sm text-mist">Yüklənir…</p>}
                {myOrders && myOrders.length === 0 && (
                  <p className="text-sm text-mist">Hələ heç bir elan almamısınız, bu kateqoriya sizə aid deyil.</p>
                )}
                {myOrders && myOrders.length > 0 && (
                  <>
                    <textarea
                      value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Problemi qısaca yazın (istəyə bağlı, əvvəlcədən)…"
                      className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-jade resize-none"
                    />
                    <p className="text-xs text-mist mb-2">Aşağıdan problemli sifarişi seçin:</p>
                    <div className="space-y-1">
                      {myOrders.map((o) => (
                        <button key={o.id} disabled={loading} onClick={() => selectOrderForProblem(o)} className="w-full flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm hover:border-gold disabled:opacity-50">
                          <span className="truncate">{o.title}</span>
                          <span className="font-mono text-jade-soft text-xs">{Number(o.amount).toFixed(2)} ₼</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {category !== "buy_problem" && (
              <form onSubmit={submitGeneric} className="space-y-3">
                <textarea
                  value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} placeholder="Ətraflı yazın…"
                  className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade resize-none"
                />
                {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={loading} className="rounded-full bg-jade text-bg font-semibold px-5 py-2.5 text-sm disabled:opacity-50">
                  {loading ? "Göndərilir…" : "Müraciət göndər"}
                </button>
              </form>
            )}
            {category === "buy_problem" && error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
          </div>
        )}

        <div>
          <h2 className="font-display text-lg mb-3">Müraciətlərim</h2>
          <div className="space-y-2">
            {tickets === null && <p className="text-sm text-mist">Yüklənir…</p>}
            {tickets && tickets.length === 0 && <p className="text-sm text-mist">Hələ müraciətiniz yoxdur.</p>}
            {(tickets ?? []).map((t) => (
              <Link key={t.id} href={`/dashboard/support/${t.id}`} className="block rounded-xl border border-line bg-panel p-4 hover:border-jade transition-colors">
                <p className="text-sm font-medium truncate">{t.subject}</p>
                <p className="text-xs text-mist mt-1">{STATUS_LABELS[t.status] ?? t.status}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
