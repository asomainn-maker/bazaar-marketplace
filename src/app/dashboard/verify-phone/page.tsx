"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyPhonePage() {
  const [phone, setPhone] = useState("0");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/phone/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kod göndərilmədi");
        return;
      }
      setStep("code");
    } catch {
      setError("Şəbəkə xətası");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/phone/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kod yanlışdır");
        return;
      }
      router.push("/dashboard/new-listing");
      router.refresh();
    } catch {
      setError("Şəbəkə xətası");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/dashboard" className="text-sm text-mist hover:text-paper mb-8 inline-block">← Dashboard</Link>
        {step === "phone" ? (
          <form onSubmit={sendCode} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Satıcı doğrulaması</p>
            <h1 className="font-display text-2xl mb-2">Telefon nömrənizi təsdiqləyin</h1>
            <p className="text-sm text-mist mb-4">Elan yerləşdirmək üçün nömrənizi bir dəfə təsdiqləməlisiniz.</p>
            <input
              value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="055 123 45 67"
              className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
            />
            {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm disabled:opacity-50">
              {loading ? "Göndərilir…" : "Kod göndər"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">SMS kod</p>
            <h1 className="font-display text-2xl mb-2">Kodu daxil edin</h1>
            <p className="text-sm text-mist mb-4">{phone} nömrəsinə göndərilən 6 rəqəmli kodu yazın.</p>
            <input
              value={code} onChange={(e) => setCode(e.target.value)} required placeholder="123456" maxLength={6}
              className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-jade"
            />
            {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm disabled:opacity-50">
              {loading ? "Yoxlanılır…" : "Təsdiqlə"}
            </button>
            <button type="button" onClick={() => setStep("phone")} className="w-full text-xs text-mist">
              Nömrəni dəyiş
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
