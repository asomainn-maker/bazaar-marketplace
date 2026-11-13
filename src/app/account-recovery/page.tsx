"use client";

import { useState } from "react";
import Link from "next/link";

export default function AccountRecoveryPage() {
  const [form, setForm] = useState({ claimedUsername: "", claimedPhone: "", claimedEmail: "", contactEmail: "", details: "", website: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  function set<K extends keyof typeof form>(key: K, value: string) { setForm((f) => ({ ...f, [key]: value })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recovery-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Xəta baş verdi"); return; }
      setDone(true);
    } catch { setError("Şəbəkə xətası"); } finally { setLoading(false); }
  }
  const input = "w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade";

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/login" className="text-sm text-mist hover:text-paper mb-8 inline-block">← Girişə qayıt</Link>
        {done ? (
          <div className="rounded-2xl border border-jade/40 bg-jade/5 p-8 text-center animate-fade-up">
            <p className="text-xs uppercase tracking-[0.2em] text-jade mb-3">Göndərildi</p>
            <h1 className="font-display text-xl mb-3">Müraciətiniz qəbul edildi</h1>
            <p className="text-sm text-mist leading-relaxed">Admin məlumatları yoxlayıb sizinlə <span className="text-paper">{form.contactEmail}</span> vasitəsilə əlaqə saxlayacaq.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-line bg-panel p-8 space-y-3 animate-fade-up">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Hesab qurtarma</p>
            <h1 className="font-display text-2xl">Hesabıma girə bilmirəm</h1>
            <p className="text-sm text-mist pb-2">Hesabınızı sübut edən nə bilirsinizsə yazın: istifadəçi adı, hesaba bağlı telefon, köhnə email. Nə qədər çox məlumat versəniz, bir o qədər tez qaytarılar.</p>
            <input className={input} placeholder="İstifadəçi adı (@olmadan)" value={form.claimedUsername} onChange={(e) => set("claimedUsername", e.target.value)} />
            <input className={input} placeholder="Hesaba bağlı telefon nömrəsi" value={form.claimedPhone} onChange={(e) => set("claimedPhone", e.target.value)} />
            <input className={input} placeholder="Hesabın köhnə/orijinal emaili" value={form.claimedEmail} onChange={(e) => set("claimedEmail", e.target.value)} />
            <input className={input} type="email" required placeholder="Sizinlə əlaqə üçün email (hazırda daxil ola biləcəyiniz)" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
            <textarea className={input + " resize-none"} rows={4} placeholder="Nə baş verdi? Son alış/satış, balans, kart son 4 rəqəmi kimi detallar…" value={form.details} onChange={(e) => set("details", e.target.value)} />
            <input className="hidden" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
            {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm disabled:opacity-50">{loading ? "Göndərilir…" : "Müraciət göndər"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
