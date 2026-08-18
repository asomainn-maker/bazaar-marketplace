"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Ledger = { id: string; type: string; amount: number; note: string | null; created_at: string };

const TYPE_LABELS: Record<string, string> = {
  deposit: "Depozit",
  platform_fee: "Platform komissiyası",
  escrow_lock: "Ödəniş (qorunmada)",
  escrow_release: "Ödəniş sərbəst buraxıldı",
  refund: "Geri qaytarma",
  withdrawal: "Çıxarış",
};

export default function WalletInner() {
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [depositAmount, setDepositAmount] = useState("20");
  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const params = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("id", user.id).maybeSingle();
      setBalance(Number(profile?.wallet_balance ?? 0));
      const { data: rows } = await supabase
        .from("ledger").select("id, type, amount, note, created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
      setLedger(rows ?? []);
    })();

    if (params.get("success")) setMessage("Balans uğurla artırıldı.");
    if (params.get("cancelled")) setMessage("Ödəniş ləğv edildi.");
    if (params.get("error")) setMessage("Ödənişdə xəta baş verdi. Yenidən cəhd edin.");
  }, [params]);

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    setDepositLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(depositAmount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Xəta baş verdi");
        return;
      }
      window.location.href = data.approveLink;
    } catch {
      setMessage("Şəbəkə xətası");
    } finally {
      setDepositLoading(false);
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setWithdrawLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(withdrawAmount), destination }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Xəta baş verdi");
        return;
      }
      setMessage("Çıxarış tələbiniz göndərildi, admin təsdiqləyəcək.");
      setBalance((b) => (b !== null ? b - Number(withdrawAmount) : b));
      setWithdrawAmount("");
      setDestination("");
    } catch {
      setMessage("Şəbəkə xətası");
    } finally {
      setWithdrawLoading(false);
    }
  }

  const feePreview = Number(depositAmount || 0) * 0.1;
  const netPreview = Number(depositAmount || 0) - feePreview;

  return (
    <div className="min-h-screen">
      <header className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link href="/dashboard" className="font-display text-lg">Bazar</Link>
        <Link href="/dashboard" className="text-sm text-mist hover:text-paper">← Dashboard</Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold mb-1">Cüzdan</p>
          <h1 className="font-display text-3xl">${balance !== null ? balance.toFixed(2) : "…"}</h1>
        </div>

        {message && <p className="text-sm bg-panel border border-line rounded-lg px-3 py-2">{message}</p>}

        <form onSubmit={handleDeposit} className="rounded-2xl border border-line bg-panel p-6 space-y-3">
          <h2 className="font-display text-lg">Balans artır (PayPal)</h2>
          <div className="relative">
            <span className="absolute left-4 top-3 text-mist text-sm">$</span>
            <input
              type="number" min="1" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
            />
          </div>
          <p className="text-xs text-mist">
            Platform komissiyası (10%): ${feePreview.toFixed(2)} · Balansınıza əlavə olunacaq: <span className="text-jade-soft">${netPreview.toFixed(2)}</span>
          </p>
          <button type="submit" disabled={depositLoading} className="w-full rounded-full bg-jade text-bg font-semibold px-4 py-3 text-sm hover:bg-jade-soft transition disabled:opacity-50">
            {depositLoading ? "Yönləndirilir…" : "PayPal ilə ödə"}
          </button>
        </form>

        <form onSubmit={handleWithdraw} className="rounded-2xl border border-line bg-panel p-6 space-y-3">
          <h2 className="font-display text-lg">Çıxarış tələb et</h2>
          <div className="relative">
            <span className="absolute left-4 top-3 text-mist text-sm">$</span>
            <input
              type="number" min="1" step="0.01" required value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Məbləğ"
              className="w-full rounded-lg border border-line bg-bg pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
            />
          </div>
          <input
            value={destination} onChange={(e) => setDestination(e.target.value)} required placeholder="PayPal email / IBAN"
            className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-jade"
          />
          <button type="submit" disabled={withdrawLoading} className="w-full rounded-full border border-line px-4 py-3 text-sm hover:border-jade transition disabled:opacity-50">
            {withdrawLoading ? "Göndərilir…" : "Tələb göndər"}
          </button>
        </form>

        <div className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="font-display text-lg mb-4">Son əməliyyatlar</h2>
          <div className="space-y-2">
            {ledger.length === 0 && <p className="text-sm text-mist">Hələ əməliyyat yoxdur.</p>}
            {ledger.map((row) => (
              <div key={row.id} className="flex items-center justify-between text-sm border-b border-line pb-2 last:border-0">
                <span className="text-mist">{TYPE_LABELS[row.type] ?? row.type}</span>
                <span className={row.amount >= 0 ? "text-jade-soft font-mono" : "text-gold font-mono"}>
                  {row.amount >= 0 ? "+" : ""}{row.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
