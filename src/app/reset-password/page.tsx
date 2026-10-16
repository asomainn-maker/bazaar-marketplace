"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    async function init() {
      // Email linki ilə gəlibsə: kodu sessiyaya çevir.
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState({}, "", url.pathname);
        if (error) {
          setError("Link köhnəlib və ya artıq istifadə olunub. Yeni kod tələb edin.");
          setReady(true);
          return;
        }
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/forgot-password");
        return;
      }
      setReady(true);
    }
    init();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setError(error.message); return; }
      setDone(true);
      setTimeout(() => { router.push("/"); router.refresh(); }, 1200);
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
        {!ready ? (
          <div className="rounded-2xl border border-line bg-panel p-8 text-center text-mist text-sm">Yüklənir…</div>
        ) : done ? (
          <div className="rounded-2xl border border-jade/40 bg-jade/5 p-8 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-jade mb-3">Uğurlu</p>
            <h1 className="font-display text-xl mb-3">Şifrəniz yeniləndi</h1>
            <p className="text-sm text-mist">Hesabınıza daxil oldunuz, yönləndirilirsiniz…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Yeni şifrə</p>
            <h1 className="font-display text-2xl mb-4">Yeni şifrənizi yazın</h1>
            <input
              type="password" required minLength={6} placeholder="Yeni şifrə (min 6 simvol)" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
            />
            {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm disabled:opacity-50">
              {loading ? "Saxlanır…" : "Şifrəni yenilə"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
