"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Şəbəkə xətası. Bir az sonra yenidən cəhd edin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-sm text-mist hover:text-paper mb-8 inline-block">← Bazar</Link>
        <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-panel p-8 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Xoş gəldiniz</p>
            <h1 className="font-display text-2xl">Giriş edin</h1>
          </div>
          <div className="space-y-3 pt-2">
            <input type="email" required placeholder="email@nümunə.com" value={email} onChange={(e)=>setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-jade" />
            <input type="password" required placeholder="Şifrə" value={password} onChange={(e)=>setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-jade" />
          </div>
          {error && <p className="text-sm text-gold bg-gold/10 border border-gold/30 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm hover:bg-jade-soft transition disabled:opacity-50">
            {loading ? "Yoxlanılır…" : "Daxil ol"}
          </button>
          <p className="text-sm text-mist text-center pt-1">Hesabınız yoxdur? <Link href="/signup" className="text-jade-soft underline underline-offset-4">Qeydiyyat</Link></p>
        </form>
      </div>
    </div>
  );
}
