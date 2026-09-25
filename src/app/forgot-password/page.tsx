"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) { setError(error.message); return; }
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
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
      if (error) { setError("Kod yanlışdır və ya vaxtı bitib"); return; }
      router.push("/reset-password");
    } catch {
      setError("Şəbəkə xətası");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/login" className="text-sm text-mist hover:text-paper mb-8 inline-block">← Girişə qayıt</Link>

        {step === "email" ? (
          <form onSubmit={sendCode} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Şifrəni bərpa et</p>
            <h1 className="font-display text-2xl mb-2">Şifrənizi unutmusunuz?</h1>
            <p className="text-sm text-mist mb-4">Email ünvanınızı yazın, sizə 6 rəqəmli kod göndərək.</p>
            <input
              type="email" required placeholder="email@nümunə.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
            />
            {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm disabled:opacity-50">
              {loading ? "Göndərilir…" : "Kod göndər"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Kod</p>
            <h1 className="font-display text-2xl mb-2">Kodu daxil edin</h1>
            <p className="text-sm text-mist mb-4"><span className="font-mono text-paper">{email}</span> ünvanına göndərilən kodu yazın.</p>
            <input
              value={code} onChange={(e) => setCode(e.target.value)} required placeholder="Kodu yazın"
              className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-jade"
            />
            {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm disabled:opacity-50">
              {loading ? "Yoxlanılır…" : "Təsdiqlə"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
