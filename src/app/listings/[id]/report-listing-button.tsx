"use client";

import { useState } from "react";

export default function ReportListingButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!reason.trim()) return;
    setLoading(true);
    await fetch(`/api/listings/${listingId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    setLoading(false);
    setDone(true);
  }

  if (done) return <p className="text-xs text-mist">Report göndərildi, təşəkkürlər.</p>;

  return open ? (
    <div className="flex items-center gap-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Səbəb yazın…"
        className="rounded-full border border-line bg-bg px-3 py-1.5 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-gold"
      />
      <button onClick={submit} disabled={loading} className="text-xs text-gold hover:underline disabled:opacity-50">
        Göndər
      </button>
    </div>
  ) : (
    <button onClick={() => setOpen(true)} className="text-xs text-mist hover:text-gold">
      🚩 Report et
    </button>
  );
}
