import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });

  const { id } = await params;
  const { action, note } = await req.json(); // 'paid' | 'rejected'
  if (!["paid", "rejected"].includes(action)) {
    return NextResponse.json({ error: "action 'paid' və ya 'rejected' olmalıdır" }, { status: 400 });
  }

  const { data: withdrawal } = await admin
    .from("withdrawals")
    .select("id, user_id, amount, status")
    .eq("id", id)
    .maybeSingle();
  if (!withdrawal || withdrawal.status !== "pending") {
    return NextResponse.json({ error: "Tələb tapılmadı və ya artıq həll olunub" }, { status: 400 });
  }

  if (action === "rejected") {
    const { data: userProfile } = await admin
      .from("profiles").select("wallet_balance").eq("id", withdrawal.user_id).maybeSingle();
    const newBalance = Number(userProfile?.wallet_balance ?? 0) + Number(withdrawal.amount);
    await admin.from("profiles").update({ wallet_balance: newBalance }).eq("id", withdrawal.user_id);
    await admin.from("ledger").insert({
      user_id: withdrawal.user_id, type: "deposit", amount: Number(withdrawal.amount),
      note: "Çıxarış rədd edildi, balans geri qaytarıldı",
    });
  }

  await admin
    .from("withdrawals")
    .update({ status: action, admin_note: note ?? null })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
