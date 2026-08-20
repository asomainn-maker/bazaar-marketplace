"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteListingButton({ listingId }: { listingId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Bu elanı silmək istəyirsiniz?")) return;
    setLoading(true);
    await fetch(`/api/listings/${listingId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="text-xs text-gold hover:underline disabled:opacity-50">
      Sil
    </button>
  );
}
