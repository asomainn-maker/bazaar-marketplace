"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Ticket = { id: string; status: string; subject: string; created_at: string };

const STATUS_LABELS: Record<string, string> = {
  open: "Açıqdır · cavab gözlənilir",
  resolved_buyer: "Həll olunub",
  resolved_seller: "Həll olunub",
  closed: "Bağlanıb",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadTickets() {
    fetch("/api/support/tickets")
      .then((r) => r.json())
      .then((d) => setTickets(d.tickets ?? []));
  }

  useEffect(() => { loadTickets(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Göndərilmədi"); return; }
    setSubject(""); setMessage("");
    loadTickets();
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/dashboard" className="font-display text-lg flex items-center gap-2"><span className="text-mist">←</span> Bazar</Link>
        <Link href="/dashboard" className="text-sm text-mist hover:text-paper">Dashboard</Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[.25em] text-gold mb-2">Yardım mərkəzi</p>
          <h1 className="font-display text-2xl">Dəstək</h1>
          <p className="text-sm text-mist mt-2">
            Sifarişlə bağlı problemlər üçün əlaqədar sifariş səhifəsindəki "Problem var, dəstəyə müraciət et" düyməsini istifadə edin.
            Digər suallar (hesab, ödəniş, texniki problem və s.) üçün aşağıdan yeni müraciət göndərin.
          </p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-line bg-panel p-6 space-y-3">
          <h2 className="font-display text-lg">Yeni müraciət</h2>
          <input
            value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mövzu (istəyə bağlı)"
            className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
          />
          <textarea
            value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} placeholder="Probleminizi ətraflı yazın…"
            className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade resize-none"
          />
          {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="rounded-full bg-jade text-bg font-semibold px-5 py-2.5 text-sm disabled:opacity-50">
            {loading ? "Göndərilir…" : "Müraciət göndər"}
          </button>
        </form>

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
