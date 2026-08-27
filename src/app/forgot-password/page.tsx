"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) { setError(error.message); return; }
      setDone(true);
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

        {done ? (
          <div className="rounded-2xl border border-jade/40 bg-jade/5 p-8 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-jade mb-3">Göndərildi</p>
            <h1 className="font-display text-xl mb-3">Emailinizi yoxlayın</h1>
            <p className="text-sm text-mist leading-relaxed">
              <span className="font-mono text-paper">{email}</span> ünvanına şifrə sıfırlama linki göndərildi.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Şifrəni bərpa et</p>
            <h1 className="font-display text-2xl mb-2">Şifrənizi unutmusunuz?</h1>
            <p className="text-sm text-mist mb-4">Email ünvanınızı yazın, sizə sıfırlama linki göndərək.</p>
            <input
              type="email" required placeholder="email@nümunə.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
            />
            {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm disabled:opacity-50">
              {loading ? "Göndərilir…" : "Link göndər"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
