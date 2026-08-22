import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdmin } from "@/lib/email";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { amount, destination } = await req.json();
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return NextResponse.json({ error: "Məbləğ düzgün deyil" }, { status: 400 });
  }
  if (typeof destination !== "string" || !destination.trim()) {
    return NextResponse.json({ error: "Ödəniş ünvanı (PayPal email / IBAN) tələb olunur" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", user.id)
    .maybeSingle();

  const balance = Number(profile?.wallet_balance ?? 0);
  if (balance < numericAmount) {
    return NextResponse.json({ error: "Balansınız kifayət etmir" }, { status: 400 });
  }

  await admin
    .from("profiles")
    .update({ wallet_balance: balance - numericAmount })
    .eq("id", user.id);

  const { data: withdrawal, error } = await admin
    .from("withdrawals")
    .insert({ user_id: user.id, amount: numericAmount, destination: destination.trim() })
    .select("id, amount, status, created_at")
    .single();

  if (error) {
    await admin.from("profiles").update({ wallet_balance: balance }).eq("id", user.id);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin.from("ledger").insert({
    user_id: user.id,
    type: "withdrawal",
    amount: -numericAmount,
    note: `Çıxarış tələbi: ${destination.trim()}`,
  });

  await notifyAdmin("Yeni çıxarış tələbi", `@${user.email} ${numericAmount.toFixed(2)} ₼ çıxarış tələb etdi (${destination.trim()}). Panelə keçib təsdiqləyin.`);
  return NextResponse.json({ withdrawal });
}
