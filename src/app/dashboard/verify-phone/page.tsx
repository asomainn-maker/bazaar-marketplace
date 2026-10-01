"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function VerifyPhonePage() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"loading" | "none" | "pending" | "code_ready" | "verified" | "change_email_code">("loading");
  const [code, setCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  async function refresh() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserEmail(user.email ?? "");
    const { data: profile } = await supabase
      .from("profiles").select("phone, phone_verified, phone_verification_code").eq("id", user.id).maybeSingle();
    if (profile?.phone_verified) setStatus("verified");
    else if (profile?.phone_verification_code) { setStatus("code_ready"); setPhone(profile.phone ?? ""); }
    else if (profile?.phone) { setStatus("pending"); setPhone(profile.phone); }
    else setStatus("none");
  }

  useEffect(() => { refresh(); }, []);

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
      if (!res.ok) { setError(data.error || "Xəta baş verdi"); return; }
      setStatus("pending");
    } catch {
      setError("Şəbəkə xətası");
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/phone/confirm-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Kod yanlışdır"); return; }
      setStatus("verified");
    } catch {
      setError("Şəbəkə xətası");
    } finally {
      setLoading(false);
    }
  }

  async function requestEmailCode() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/phone/request-change-code", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Xəta baş verdi"); return; }
    setStatus("change_email_code");
  }

  async function confirmEmailCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/phone/confirm-change-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: emailCode }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Kod yanlışdır"); return; }
    setPhone(""); setEmailCode(""); setStatus("none");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/dashboard" className="text-sm text-mist hover:text-paper mb-8 inline-block">← Dashboard-a qayıt</Link>

        {status === "loading" && <div className="rounded-2xl border border-line bg-panel p-8 text-center text-mist text-sm">Yüklənir…</div>}

        {status === "verified" && (
          <div className="rounded-2xl border border-jade/40 bg-jade/5 p-8 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-jade mb-3">Təsdiqlənib</p>
            <h1 className="font-display text-xl mb-3">Nömrəniz artıq təsdiqlənib</h1>
            <p className="text-sm text-mist mb-5">{phone && <span className="font-mono">{phone}</span>}</p>
            <div className="flex gap-2 justify-center">
              <Link href="/dashboard/new-listing" className="inline-block rounded-full bg-jade text-bg font-semibold px-5 py-2.5 text-sm">
                Elan yerləşdir
              </Link>
              <button onClick={requestEmailCode} disabled={loading} className="rounded-full border border-line px-5 py-2.5 text-sm text-paper hover:border-jade transition disabled:opacity-50">
                Nömrəni dəyiş
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
          </div>
        )}

        {status === "change_email_code" && (
          <form onSubmit={confirmEmailCode} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Təhlükəsizlik</p>
            <h1 className="font-display text-2xl mb-2">Email kodunu daxil edin</h1>
            <p className="text-sm text-mist mb-4"><span className="font-mono text-paper">{userEmail}</span> ünvanına göndərilən kodu yazın (nömrəni dəyişmək üçün).</p>
            <input
              value={emailCode} onChange={(e) => setEmailCode(e.target.value)} required placeholder="Email kodu"
              className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm tracking-[0.2em] text-center focus:outline-none focus:ring-2 focus:ring-jade"
            />
            {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm disabled:opacity-50">
              {loading ? "Yoxlanılır…" : "Təsdiqlə və davam et"}
            </button>
          </form>
        )}

        {status === "pending" && (
          <div className="rounded-2xl border border-gold/40 bg-gold/5 p-8 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-3">Gözləyir</p>
            <h1 className="font-display text-xl mb-3">Nömrənizə zəng ediləcək</h1>
            <p className="text-sm text-mist leading-relaxed mb-5">
              <span className="font-mono text-paper">{phone}</span> nömrəsi qeydə alındı.
              Admin sizə zəng edib bir kod deyəcək — daha sonra bura qayıdıb həmin kodu yazacaqsınız.
            </p>
            <Link href="/dashboard" className="inline-block rounded-full border border-line px-5 py-2.5 text-sm text-paper hover:border-jade transition">
              İndilik dashboard-a qayıt
            </Link>
          </div>
        )}

        {status === "code_ready" && (
          <form onSubmit={submitCode} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Kod hazırdır</p>
            <h1 className="font-display text-2xl mb-2">Kodu daxil edin</h1>
            <p className="text-sm text-mist mb-4">Admin sizə zəng edərək dediyi kodu bura yazın.</p>
            <input
              value={code} onChange={(e) => setCode(e.target.value)} required placeholder="Kod"
              className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-jade"
            />
            {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm disabled:opacity-50">
              {loading ? "Yoxlanılır…" : "Təsdiqlə"}
            </button>
          </form>
        )}

        {status === "none" && (
          <form onSubmit={submitPhone} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Satıcı doğrulaması</p>
            <h1 className="font-display text-2xl mb-2">Telefon nömrənizi göndərin</h1>
            <p className="text-sm text-mist mb-4">Elan yerləşdirmək üçün nömrənizi göndərin — admin sizə zəng edib təsdiq kodu deyəcək.</p>
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
