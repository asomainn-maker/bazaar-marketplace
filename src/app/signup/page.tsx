"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import GoogleButton from "../google-button";

export default function SignupPage() {
  const [step, setStep] = useState<"form" | "code">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message.includes("already") ? "Bu email artıq qeydiyyatdan keçib. Giriş edin." : error.message);
        return;
      }
      // Supabase mövcud email üçün səssiz "uğur" qaytarır — identities boşdur.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError("Bu email artıq qeydiyyatdan keçib. Giriş edin və ya şifrəni bərpa edin.");
        return;
      }
      if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        setStep("code");
      }
    } catch {
      setError("Şəbəkə xətası. Bir az sonra yenidən cəhd edin.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "signup" });
      if (error) { setError("Kod yanlışdır və ya vaxtı bitib"); return; }
      router.push("/");
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
        <Link href="/" className="text-sm text-mist hover:text-paper mb-8 inline-block">← İtemBazar</Link>

        {step === "code" ? (
          <form onSubmit={verifyCode} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Bir addım qalıb</p>
            <h1 className="font-display text-2xl mb-2">Emailinizi təsdiqləyin</h1>
            <p className="text-sm text-mist mb-2"><span className="font-mono text-paper">{email}</span> ünvanına göndərilən kodu yazın.</p>
            <input
              value={code} onChange={(e) => setCode(e.target.value)} required placeholder="Təsdiq kodu"
              className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm tracking-[0.2em] text-center focus:outline-none focus:ring-2 focus:ring-jade"
            />
            {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm disabled:opacity-50">
              {loading ? "Yoxlanılır…" : "Təsdiqlə"}
            </button>
            <button type="button" onClick={() => { setStep("form"); setError(null); }} className="w-full text-xs text-mist">← Geri</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Qeydiyyat</p>
              <h1 className="font-display text-2xl">Hesab yaradın</h1>
            </div>
            <GoogleButton />
            <div className="flex items-center gap-3 text-xs text-mist"><div className="flex-1 h-px bg-line" />və ya<div className="flex-1 h-px bg-line" /></div>
            <div className="space-y-3">
              <input type="email" required placeholder="email@nümunə.com" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-jade" />
              <input type="password" required minLength={6} placeholder="Şifrə (min 6 simvol)" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-jade" />
            </div>
            {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm hover:bg-jade-soft transition disabled:opacity-50">
              {loading ? "Göndərilir…" : "Qeydiyyatdan keç"}
            </button>
            <p className="text-[11px] text-mist text-center">
              Qeydiyyatdan keçməklə <Link href="/terms" className="underline">İstifadə şərtlərini</Link> və <Link href="/privacy" className="underline">Məxfilik siyasətini</Link> qəbul edirsiniz.
            </p>
            <p className="text-sm text-mist text-center pt-1">Artıq hesabınız var? <Link href="/login" className="text-jade-soft underline underline-offset-4">Giriş</Link></p>
          </form>
        )}
      </div>
    </div>
  );
}
