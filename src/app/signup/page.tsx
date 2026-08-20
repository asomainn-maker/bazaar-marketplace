"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); return; }
      if (data.session) { router.push("/"); router.refresh(); }
      else setDone(true);
    } catch {
      setError("Şəbəkə xətası. Bir az sonra yenidən cəhd edin.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-sm text-mist hover:text-paper mb-8 inline-block">← Bazar</Link>
        {done ? (
          <div className="rounded-2xl border border-line bg-panel p-8 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-3">Bir addım qalıb</p>
            <h1 className="font-display text-xl mb-3">Emailinizi yoxlayın</h1>
            <p className="text-sm text-mist leading-relaxed"><span className="font-mono text-paper">{email}</span> ünvanına göndərilən linkə klikləyin.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Qeydiyyat</p>
              <h1 className="font-display text-2xl">Hesab yaradın</h1>
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full rounded-full border border-line bg-bg px-4 py-3 text-sm font-medium hover:border-jade transition flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.4 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3c-7.6 0-14.2 4.3-17.7 10.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.4 26.7 37 24 37c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.7 40.6 16.3 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C40.9 36 44 30.6 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
              Google ilə davam et
            </button>
            <div className="flex items-center gap-3 text-xs text-mist"><div className="flex-1 h-px bg-line"/>və ya<div className="flex-1 h-px bg-line"/></div>
            <div className="space-y-3">
              <input type="email" required placeholder="email@nümunə.com" value={email} onChange={(e)=>setEmail(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-jade" />
              <input type="password" required minLength={6} placeholder="Şifrə (min 6 simvol)" value={password} onChange={(e)=>setPassword(e.target.value)}
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
