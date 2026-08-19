"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PhoneVerificationActions({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function act(action: "approve" | "reject") {
    setLoading(true);
    await fetch(`/api/admin/phone-verifications/${userId}`, {
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
        onClick={() => act("approve")}
        disabled={loading}
        className="rounded-full bg-jade text-bg text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
      >
        Təsdiqlə
      </button>
      <button
        onClick={() => act("reject")}
        disabled={loading}
        className="rounded-full border border-line text-xs px-3 py-1.5 disabled:opacity-50"
      >
        Rədd et
      </button>
    </div>
  );
}
