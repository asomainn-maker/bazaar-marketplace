"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PhoneVerificationActions({ userId, hasCode }: { userId: string; hasCode: boolean }) {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const router = useRouter();

  async function setCodeAction() {
    if (!code.trim()) return;
    setLoading(true);
    await fetch(`/api/admin/phone-verifications/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set-code", code: code.trim() }),
    });
    setLoading(false);
    router.refresh();
  }

  async function reject() {
    setLoading(true);
    await fetch(`/api/admin/phone-verifications/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={hasCode ? "Yeni kod…" : "Kod təyin et (məs. 565565)"}
        className="rounded-lg border border-line bg-bg px-3 py-1.5 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-jade"
      />
      <button
        onClick={setCodeAction}
        disabled={loading || !code.trim()}
        className="rounded-full bg-jade text-bg text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
      >
        {hasCode ? "Kodu yenilə" : "Kod təyin et"}
      </button>
      <button
        onClick={reject}
        disabled={loading}
        className="rounded-full border border-line text-xs px-3 py-1.5 disabled:opacity-50"
      >
        Rədd et
      </button>
    </div>
  );
}
