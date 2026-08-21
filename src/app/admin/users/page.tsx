"use client";

import { useState } from "react";
import Link from "next/link";

type UserRow = {
  id: string;
  username: string;
  wallet_balance: number;
  is_banned: boolean;
  is_admin: boolean;
  phone: string | null;
  phone_verified: boolean;
  can_list: boolean;
  can_message: boolean;
  created_at: string;
};

type ListingRow = { id: string; title: string; price: number; status: string };

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [openListings, setOpenListings] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingRow[]>([]);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query.trim())}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  function patchUser(id: string, patch: Partial<UserRow>) {
    setUsers((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function toggleBan(u: UserRow) {
    await fetch(`/api/admin/users/${u.id}/ban`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: !u.is_banned }),
    });
    patchUser(u.id, { is_banned: !u.is_banned });
  }

  async function toggleListingBlock(u: UserRow) {
    await fetch(`/api/admin/users/${u.id}/toggle-listing-block`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked: u.can_list }),
    });
    patchUser(u.id, { can_list: !u.can_list });
  }

  async function toggleMessageBlock(u: UserRow) {
    await fetch(`/api/admin/users/${u.id}/toggle-message-block`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked: u.can_message }),
    });
    patchUser(u.id, { can_message: !u.can_message });
  }

  async function resetPhone(u: UserRow) {
    if (!confirm(`@${u.username}-in telefonu sıfırlansın?`)) return;
    await fetch(`/api/admin/users/${u.id}/reset-phone`, { method: "POST" });
    patchUser(u.id, { phone: null, phone_verified: false });
  }

  async function forceVerifyPhone(u: UserRow) {
    await fetch(`/api/admin/users/${u.id}/verify-phone`, { method: "POST" });
    patchUser(u.id, { phone_verified: true });
  }

  async function deleteUser(u: UserRow) {
    if (!confirm(`@${u.username} tamamilə silinsin? Bu geri qaytarıla bilməz.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}/delete`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error); return; }
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
  }

  async function toggleListingsView(u: UserRow) {
    if (openListings === u.id) { setOpenListings(null); return; }
    const res = await fetch(`/api/admin/users/${u.id}/listings`);
    const data = await res.json();
    setListings(data.listings ?? []);
    setOpenListings(u.id);
  }

  async function removeOneListing(listingId: string) {
    await fetch(`/api/listings/${listingId}`, { method: "DELETE" });
    setListings((prev) => prev.filter((l) => l.id !== listingId));
  }

  async function submitTransfer(u: UserRow) {
    const res = await fetch(`/api/admin/users/${u.id}/transfer-balance`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(transferAmount), toUsername: transferTo }),
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error); return; }
    setMessage(`$${transferAmount} @${u.username}-dan @${transferTo}-a köçürüldü.`);
    setTransferTarget(null); setTransferAmount(""); setTransferTo("");
    search();
  }

  return (
    <div className="min-h-screen">
      <header className="max-w-3xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/admin" className="font-display text-lg">Bazar · Admin</Link>
        <Link href="/admin" className="text-sm text-mist hover:text-paper">← Panel</Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-display text-2xl mb-6">İstifadəçilər</h1>

        <form onSubmit={search} className="flex gap-2 mb-6">
          <input
            value={query} onChange={(e) => setQuery(e.target.value)} placeholder="İstifadəçi adı axtar…"
            className="flex-1 rounded-lg border border-line bg-panel px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
          />
          <button type="submit" disabled={loading} className="rounded-full bg-jade text-bg font-semibold px-5 py-3 text-sm disabled:opacity-50">
            {loading ? "…" : "Axtar"}
          </button>
        </form>

        {message && <p className="text-sm bg-panel border border-line rounded-lg px-3 py-2 mb-4">{message}</p>}

        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl border border-line bg-panel p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium">
                    @{u.username} {u.is_admin && <span className="text-xs text-gold">(admin)</span>}
                    {u.is_banned && <span className="text-xs text-gold ml-2">🚫 Banlanıb</span>}
                    {!u.can_list && <span className="text-xs text-mist ml-2">⛔ Elan bloklu</span>}
                    {!u.can_message && <span className="text-xs text-mist ml-2">⛔ Mesaj bloklu</span>}
                  </p>
                  <p className="text-xs text-mist">
                    Balans: ${Number(u.wallet_balance).toFixed(2)} · Telefon: {u.phone ?? "yoxdur"} {u.phone_verified && "✓"}
                  </p>
                </div>
                {!u.is_admin && (
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => toggleBan(u)} className="rounded-full border border-line text-xs px-3 py-1.5 hover:border-gold">
                      {u.is_banned ? "Ban aç" : "Ban et"}
                    </button>
                    <button onClick={() => toggleListingsView(u)} className="rounded-full border border-line text-xs px-3 py-1.5 hover:border-jade">
                      Elanlarını göstər
                    </button>
                    <button onClick={() => toggleListingBlock(u)} className="rounded-full border border-line text-xs px-3 py-1.5 hover:border-gold">
                      {u.can_list ? "Elan bloklа" : "Elan aç"}
                    </button>
                    <button onClick={() => toggleMessageBlock(u)} className="rounded-full border border-line text-xs px-3 py-1.5 hover:border-gold">
                      {u.can_message ? "Mesaj bloklа" : "Mesaj aç"}
                    </button>
                    {u.phone && !u.phone_verified && (
                      <button onClick={() => forceVerifyPhone(u)} className="rounded-full border border-jade text-jade text-xs px-3 py-1.5">
                        Telefonu təsdiqlə
                      </button>
                    )}
                    {u.phone && (
                      <button onClick={() => resetPhone(u)} className="rounded-full border border-line text-xs px-3 py-1.5 hover:border-gold">
                        Telefonu sıfırla
                      </button>
                    )}
                    <button onClick={() => setTransferTarget(transferTarget === u.id ? null : u.id)} className="rounded-full border border-line text-xs px-3 py-1.5 hover:border-jade">
                      Balansı köçür
                    </button>
                    <button onClick={() => deleteUser(u)} className="rounded-full border border-gold/40 text-gold text-xs px-3 py-1.5">
                      Sil
                    </button>
                  </div>
                )}
              </div>

              {openListings === u.id && (
                <div className="mt-3 pt-3 border-t border-line space-y-2">
                  {listings.length === 0 && <p className="text-xs text-mist">Aktiv elanı yoxdur.</p>}
                  {listings.map((l) => (
                    <div key={l.id} className="flex items-center justify-between text-sm">
                      <span>{l.title} <span className="text-mist text-xs">({l.status === "active" ? "Aktiv" : "Satılıb"})</span></span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-jade-soft text-xs">${Number(l.price).toFixed(2)}</span>
                        {l.status === "active" && (
                          <button onClick={() => removeOneListing(l.id)} className="text-xs text-gold hover:underline">Qaldır</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {transferTarget === u.id && (
                <div className="mt-3 pt-3 border-t border-line flex gap-2 flex-wrap items-center">
                  <input
                    value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="Məbləğ" type="number"
                    className="w-24 rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
                  />
                  <input
                    value={transferTo} onChange={(e) => setTransferTo(e.target.value)} placeholder="Hədəf istifadəçi adı"
                    className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
                  />
                  <button onClick={() => submitTransfer(u)} className="rounded-full bg-jade text-bg text-xs font-semibold px-4 py-2">
                    Köçür
                  </button>
                </div>
              )}
            </div>
          ))}
          {users.length === 0 && query && !loading && <p className="text-sm text-mist">Nəticə tapılmadı.</p>}
        </div>
      </main>
    </div>
  );
}
