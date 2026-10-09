"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SiteSettingsForm({ initialCard, initialHolder }: { initialCard: string; initialHolder: string }) {
  const [card, setCard] = useState(initialCard);
  const [holder, setHolder] = useState(initialHolder);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function save() {
    setLoading(true);
    await fetch("/api/admin/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "bank_card", value: card }),
    });
    await fetch("/api/admin/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "bank_holder", value: holder }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <input
        value={card} onChange={(e) => setCard(e.target.value)} placeholder="Kart nömrəsi"
        className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-jade"
      />
      <input
        value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Kart sahibinin adı"
        className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
      />
      <button onClick={save} disabled={loading} className="rounded-full bg-jade text-bg text-xs font-semibold px-4 py-2 disabled:opacity-50">
        {loading ? "Saxlanır…" : "Saxla"}
      </button>
    </div>
  );
}
