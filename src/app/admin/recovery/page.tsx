"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Account = {
  id: string; username: string; phone: string | null; phone_verified: boolean; wallet_balance: number;
  is_banned: boolean; created_at: string; email: string | null; last_sign_in_at: string | null; providers: string[];
  email_history: { old_email: string | null; new_email: string; created_at: string }[];
  cards: { card_last4: string; gross_amount: number; created_at: string }[];
  bank_notes: { sender_note: string | null; amount: number; status: string; created_at: string }[];
  sales: number; purchases: number;
};
type Req = { id: string; claimed_username: string | null; claimed_phone: string | null; claimed_email: string | null; contact_email: string; details: string | null; ip: string | null; created_at: string };
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("az") : "—");

export default function AdminRecoveryPage() {
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [emailInputs, setEmailInputs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  async function loadRequests() {
    const r = await fetch("/api/admin/recovery/requests");
    const d = await r.json();
    setRequests(d.requests ?? []);
  }
  useEffect(() => { loadRequests(); }, []);

  async function search(q = query) {
    if (q.trim().length < 2) return;
    setLoading(true);
    setMsg(null);
    const r = await fetch(`/api/admin/recovery/search?q=${encodeURIComponent(q.trim())}`);
    const d = await r.json();
    setAccounts(d.accounts ?? []);
    setSearched(true);
    setLoading(false);
  }

  async function changeEmail(a: Account) {
    const newEmail = emailInputs[a.id]?.trim();
    if (!newEmail) return;
    if (!confirm(`@${a.username} hesabının emaili ${newEmail} olaraq dəyişdirilsin? Bundan sonra giriş kodları yeni emailə gedəcək.`)) return;
    const r = await fetch(`/api/admin/users/${a.id}/change-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newEmail }) });
    const d = await r.json();
    setMsg(r.ok ? `Email dəyişdirildi: ${newEmail}` : d.error);
    if (r.ok) { setEmailInputs((p) => ({ ...p, [a.id]: "" })); search(); }
  }

  async function closeRequest(id: string, status: "resolved" | "rejected") {
    await fetch("/api/admin/recovery/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    loadRequests();
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-3xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/admin" className="font-display text-lg">İtemBazar · Admin</Link>
        <Link href="/admin" className="text-sm text-mist hover:text-paper">← Panel</Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[.25em] text-gold mb-2">Hesab qurtar</p>
          <h1 className="font-display text-2xl">Hesab axtarışı və bərpa</h1>
          <p className="text-sm text-mist mt-1">İstifadəçi adı, telefon, hazırkı və ya köhnə email ilə axtarın.</p>
        </div>

        {requests.length > 0 && (
          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-5 space-y-3">
            <p className="text-xs uppercase tracking-widest text-gold">Açıq müraciətlər ({requests.length})</p>
            {requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-line bg-panel p-4 text-sm space-y-1">
                <p>İstifadəçi adı: <b>{r.claimed_username || "—"}</b> · Telefon: <span className="font-mono">{r.claimed_phone || "—"}</span></p>
                <p>Köhnə email: <span className="font-mono">{r.claimed_email || "—"}</span> · Əlaqə: <span className="font-mono">{r.contact_email}</span></p>
                {r.details && <p className="text-mist whitespace-pre-wrap">{r.details}</p>}
                <p className="text-[11px] text-mist">IP: {r.ip} · {fmt(r.created_at)}</p>
                <div className="flex gap-2 pt-1 flex-wrap">
                  {[r.claimed_username, r.claimed_phone, r.claimed_email].filter(Boolean).map((v) => (
                    <button key={v} onClick={() => { setQuery(String(v)); search(String(v)); }} className="rounded-full border border-line text-xs px-3 py-1 hover:border-jade">Axtar: {v}</button>
                  ))}
                  <button onClick={() => closeRequest(r.id, "resolved")} className="rounded-full bg-jade text-bg text-xs font-semibold px-3 py-1">Həll olundu</button>
                  <button onClick={() => closeRequest(r.id, "rejected")} className="rounded-full border border-line text-xs px-3 py-1">Rədd</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="username / telefon / email"
            className="flex-1 rounded-lg border border-line bg-panel px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade" />
          <button type="submit" disabled={loading} className="rounded-full bg-jade text-bg font-semibold px-5 py-3 text-sm disabled:opacity-50">{loading ? "…" : "Axtar"}</button>
        </form>

        {msg && <p className="text-sm bg-panel border border-line rounded-lg px-3 py-2">{msg}</p>}
        {searched && accounts.length === 0 && <p className="text-sm text-mist">Heç bir hesab tapılmadı.</p>}

        <div className="space-y-4">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-2xl border border-line bg-panel p-5 space-y-3 animate-fade-up">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-display text-lg">@{a.username} {a.is_banned && <span className="text-xs text-gold">🚫 banlı</span>}</p>
                <p className="font-mono text-jade-soft">{Number(a.wallet_balance).toFixed(2)} ₼</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <p><span className="text-mist">Hazırkı email:</span> <span className="font-mono">{a.email ?? "—"}</span></p>
                <p><span className="text-mist">Telefon:</span> <span className="font-mono">{a.phone ?? "—"}</span> {a.phone_verified && "✓"}</p>
                <p><span className="text-mist">Qeydiyyat:</span> {fmt(a.created_at)}</p>
                <p><span className="text-mist">Son giriş:</span> {fmt(a.last_sign_in_at)}</p>
                <p><span className="text-mist">Giriş üsulları:</span> {a.providers.join(", ") || "—"}</p>
                <p><span className="text-mist">Satış / alış:</span> {a.sales} / {a.purchases}</p>
              </div>
              <div className="text-sm">
                <p className="text-xs uppercase tracking-widest text-mist mb-1">Email tarixçəsi</p>
                {a.email_history.length === 0 ? <p className="text-mist text-xs">Dəyişiklik olmayıb.</p> : a.email_history.map((h, i) => (
                  <p key={i} className="font-mono text-xs">{h.old_email ?? "?"} → {h.new_email} <span className="text-mist">({fmt(h.created_at)})</span></p>
                ))}
              </div>
              <div className="text-sm">
                <p className="text-xs uppercase tracking-widest text-mist mb-1">Balans artırmada istifadə olunan kartlar (son 4 rəqəm)</p>
                {a.cards.length === 0 ? <p className="text-mist text-xs">PayPal kart qeydi yoxdur.</p> : a.cards.map((c, i) => (
                  <p key={i} className="font-mono text-xs">**** {c.card_last4} — {Number(c.gross_amount).toFixed(2)} ₼ <span className="text-mist">({fmt(c.created_at)})</span></p>
                ))}
                {a.bank_notes.map((b, i) => (<p key={i} className="font-mono text-xs">Bank: {b.sender_note} — {Number(b.amount).toFixed(2)} ₼ ({b.status})</p>))}
              </div>
              <div className="flex gap-2 pt-2 border-t border-line">
                <input value={emailInputs[a.id] ?? ""} onChange={(e) => setEmailInputs((p) => ({ ...p, [a.id]: e.target.value }))}
                  placeholder="Yeni email (sahibi təsdiqlənibsə)" type="email"
                  className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade" />
                <button onClick={() => changeEmail(a)} className="rounded-full bg-gold text-bg text-xs font-semibold px-4 py-2">Emaili dəyiş</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
