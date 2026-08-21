"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReportActions({ reportId, listingId, isRemoved }: { reportId: string; listingId: string; isRemoved: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function act(action: "remove_listing" | "dismiss") {
    setLoading(true);
    await fetch(`/api/admin/reports/${reportId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, listingId }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {!isRemoved && (
        <button onClick={() => act("remove_listing")} disabled={loading} className="rounded-full border border-gold/40 text-gold text-xs px-3 py-1.5 disabled:opacity-50">
          Elanı sil
        </button>
      )}
      <button onClick={() => act("dismiss")} disabled={loading} className="rounded-full border border-line text-xs px-3 py-1.5 disabled:opacity-50">
        Bağla (etibarsız)
      </button>
    </div>
  );
}
