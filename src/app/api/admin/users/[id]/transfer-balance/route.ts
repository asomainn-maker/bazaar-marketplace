import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const { amount, toUsername } = await req.json();
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return NextResponse.json({ error: "Məbləğ düzgün deyil" }, { status: 400 });
  }
  if (typeof toUsername !== "string" || !toUsername.trim()) {
    return NextResponse.json({ error: "Hədəf istifadəçi adı tələb olunur" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: fromProfile } = await admin.from("profiles").select("wallet_balance").eq("id", id).maybeSingle();
  if (!fromProfile || Number(fromProfile.wallet_balance) < numericAmount) {
    return NextResponse.json({ error: "Balans kifayət etmir" }, { status: 400 });
  }

  const { data: toProfile } = await admin
    .from("profiles").select("id, wallet_balance").eq("username", toUsername.trim()).maybeSingle();
  if (!toProfile) return NextResponse.json({ error: "Hədəf istifadəçi tapılmadı" }, { status: 404 });

  await admin.from("profiles").update({ wallet_balance: Number(fromProfile.wallet_balance) - numericAmount }).eq("id", id);
  await admin.from("profiles").update({ wallet_balance: Number(toProfile.wallet_balance) + numericAmount }).eq("id", toProfile.id);

  await admin.from("ledger").insert([
    { user_id: id, type: "withdrawal", amount: -numericAmount, note: `Admin köçürməsi: @${toUsername.trim()}-a` },
    { user_id: toProfile.id, type: "deposit", amount: numericAmount, note: "Admin köçürməsi" },
  ]);

  return NextResponse.json({ ok: true });
}
