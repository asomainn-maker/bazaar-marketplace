"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordInner() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get("code");
    const supabase = createClient();
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setError(error.message); return; }
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch {
      setError("Şəbəkə xətası");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <div className="rounded-2xl border border-line bg-panel p-8 text-center text-mist text-sm">Yüklənir…</div>;
  }

  return (
    <div className="w-full max-w-sm">
      <Link href="/login" className="text-sm text-mist hover:text-paper mb-8 inline-block">← Girişə qayıt</Link>
      {done ? (
        <div className="rounded-2xl border border-jade/40 bg-jade/5 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-jade mb-3">Uğurlu</p>
          <h1 className="font-display text-xl mb-3">Şifrəniz dəyişdirildi</h1>
          <p className="text-sm text-mist">Dashboard-a yönləndirilirsiniz…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Yeni şifrə</p>
          <h1 className="font-display text-2xl mb-4">Yeni şifrənizi təyin edin</h1>
          <input
            type="password" required minLength={6} placeholder="Yeni şifrə (min 6 simvol)" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
          />
          {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm disabled:opacity-50">
            {loading ? "Saxlanır…" : "Şifrəni dəyiş"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-mist text-sm">Yüklənir…</div>}>
        <ResetPasswordInner />
      </Suspense>
    </div>
  );
}
