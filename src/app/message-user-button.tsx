"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MessageUserButton({
  otherUserId,
  listingId,
  label = "💬 Mesaj yaz",
}: {
  otherUserId: string;
  listingId?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId, listingId: listingId ?? null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Xəta baş verdi"); return; }
      router.push(`/dashboard/messages/${data.conversationId}`);
    } catch {
      setError("Şəbəkə xətası");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-full border border-line px-4 py-2 text-sm text-paper hover:border-jade transition disabled:opacity-50"
      >
        {loading ? "…" : label}
      </button>
      {error && <p className="text-xs text-gold mt-1">{error}</p>}
    </div>
  );
}
