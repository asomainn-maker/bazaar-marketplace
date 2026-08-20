"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminOrderActions({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function act(action: "refund" | "release") {
    const label = action === "refund" ? "Alıcıya geri qaytarılsın?" : "Satıcıya ödəniş buraxılsın?";
    if (!confirm(label)) return;
    setLoading(true);
    await fetch(`/api/admin/orders/${orderId}/force-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-3">
      <button onClick={() => act("refund")} disabled={loading} className="flex-1 rounded-full border border-jade text-jade font-semibold px-4 py-2.5 text-sm disabled:opacity-50">
        Alıcıya geri qaytar
      </button>
      <button onClick={() => act("release")} disabled={loading} className="flex-1 rounded-full bg-jade text-bg font-semibold px-4 py-2.5 text-sm disabled:opacity-50">
        Satıcıya buraxılışı ver
      </button>
    </div>
  );
}
