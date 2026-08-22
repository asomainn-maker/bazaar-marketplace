"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BuyButton({ listingId, price }: { listingId: string; price: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleBuy() {
    if (!confirm(`${price.toFixed(2)} ₼ ödəyib bu elanı almaq istəyirsiniz? Pul siz təsdiqləyənə qədər qorunacaq.`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Alınmadı");
        return;
      }
      router.push(`/dashboard/orders/${data.order.id}`);
    } catch {
      setError("Şəbəkə xətası");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-right">
      <button
        onClick={handleBuy}
        disabled={loading}
        className="rounded-full bg-jade text-bg px-6 py-3 text-sm font-semibold hover:bg-jade-soft transition disabled:opacity-50"
      >
        {loading ? "…" : "İndi al"}
      </button>
      {error && <p className="mt-2 text-xs text-gold">{error}</p>}
    </div>
  );
}
