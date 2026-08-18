"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawalActions({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function act(action: "paid" | "rejected") {
    setLoading(true);
    await fetch(`/api/admin/withdrawals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => act("paid")}
        disabled={loading}
        className="rounded-full bg-jade text-bg text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
      >
        Ödəndi
      </button>
      <button
        onClick={() => act("rejected")}
        disabled={loading}
        className="rounded-full border border-line text-xs px-3 py-1.5 disabled:opacity-50"
      >
        Rədd et
      </button>
    </div>
  );
}
