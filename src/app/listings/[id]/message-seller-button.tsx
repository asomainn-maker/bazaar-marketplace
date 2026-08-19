"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MessageSellerButton({ sellerId, listingId }: { sellerId: string; listingId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId, listingId }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) router.push(`/dashboard/messages/${data.conversationId}`);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-full border border-line px-4 py-2 text-sm text-paper hover:border-jade transition disabled:opacity-50"
    >
      💬 Satıcıya yaz
    </button>
  );
}
