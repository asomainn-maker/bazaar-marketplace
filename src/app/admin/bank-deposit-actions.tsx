"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BankDepositActions({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function act(action: "approve" | "reject") {
    const label = action === "approve" ? "Köçürmə təsdiqlənsin, balans artırılsın?" : "Bu tələb rədd edilsin?";
    if (!confirm(label)) return;
    setLoading(true);
    await fetch(`/api/admin/bank-deposits/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => act("approve")} disabled={loading} className="rounded-full bg-jade text-bg text-xs font-semibold px-3 py-1.5 disabled:opacity-50">
        Təsdiqlə
      </button>
      <button onClick={() => act("reject")} disabled={loading} className="rounded-full border border-line text-xs px-3 py-1.5 disabled:opacity-50">
        Rədd et
      </button>
    </div>
  );
}
