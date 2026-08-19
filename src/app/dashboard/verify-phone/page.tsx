"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function VerifyPhonePage() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"loading" | "none" | "pending" | "verified">("loading");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("phone, phone_verified").eq("id", user.id).maybeSingle();
      if (profile?.phone_verified) setStatus("verified");
      else if (profile?.phone) { setStatus("pending"); setPhone(profile.phone); }
      else setStatus("none");
    })();
  }, []);

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/phone/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xəta baş verdi");
        return;
      }
      setStatus("pending");
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

        {status === "loading" && <div className="rounded-2xl border border-line bg-panel p-8 text-center text-mist text-sm">Yüklənir…</div>}

        {status === "verified" && (
          <div className="rounded-2xl border border-jade/40 bg-jade/5 p-8 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-jade mb-3">Təsdiqlənib</p>
            <h1 className="font-display text-xl mb-3">Nömrəniz artıq təsdiqlənib</h1>
            <Link href="/dashboard/new-listing" className="inline-block rounded-full bg-jade text-bg font-semibold px-5 py-2.5 text-sm">
              Elan yerləşdir
            </Link>
          </div>
        )}

        {status === "pending" && (
          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-8 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-3">Gözləyir</p>
            <h1 className="font-display text-xl mb-3">Admin təsdiqi gözlənilir</h1>
            <p className="text-sm text-mist leading-relaxed">
              <span className="font-mono text-paper">{phone}</span> nömrəsi göndərildi.
              Admin qısa müddətdə təsdiqləyəcək, sonra elan yerləşdirə biləcəksiniz.
            </p>
          </div>
        )}

        {status === "none" && (
          <form onSubmit={submitPhone} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Satıcı doğrulaması</p>
            <h1 className="font-display text-2xl mb-2">Telefon nömrənizi göndərin</h1>
            <p className="text-sm text-mist mb-4">Elan yerləşdirmək üçün nömrənizi göndərin, admin qısa müddətdə təsdiqləyəcək.</p>
            <input
              value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="055 123 45 67"
              className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
            />
            {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm disabled:opacity-50">
              {loading ? "Göndərilir…" : "Göndər"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
