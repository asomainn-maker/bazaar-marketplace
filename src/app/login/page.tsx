"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import GoogleButton from "../google-button";

function translateError(message: string) {
  if (message.includes("Invalid login credentials")) return "Email və ya şifrə yanlışdır.";
  if (message.includes("Email not confirmed")) return "Email hələ təsdiqlənməyib. Qeydiyyatda göndərilən kodu daxil edin.";
  return message;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const e = params.get("error");
    if (e) setError(e);
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient({ rememberMe });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(translateError(error.message)); return; }
      fetch("/api/auth/login-alert", { method: "POST" }).catch(() => {});
      router.push("/");
      router.refresh();
    } catch {
      setError("Şəbəkə xətası. Bir az sonra yenidən cəhd edin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="text-sm text-mist hover:text-paper mb-8 inline-block">← İtemBazar</Link>
      <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Xoş gəldiniz</p>
          <h1 className="font-display text-2xl">Giriş edin</h1>
        </div>
        <GoogleButton />
        <div className="flex items-center gap-3 text-xs text-mist"><div className="flex-1 h-px bg-line" />və ya<div className="flex-1 h-px bg-line" /></div>
        <div className="space-y-3">
          <input type="email" required placeholder="email@nümunə.com" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-jade" />
          <input type="password" required placeholder="Şifrə" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-jade" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-mist cursor-pointer">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="accent-jade" />
            Məni xatırla
          </label>
          <Link href="/forgot-password" className="text-jade-soft hover:underline">Şifrəni unutdum</Link>
        </div>
        {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm hover:bg-jade-soft transition disabled:opacity-50">
          {loading ? "Yoxlanılır…" : "Daxil ol"}
        </button>
        <p className="text-sm text-mist text-center pt-1">Hesabınız yoxdur? <Link href="/signup" className="text-jade-soft underline underline-offset-4">Qeydiyyat</Link></p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-mist text-sm">Yüklənir…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
