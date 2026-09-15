import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logToDiscord } from "@/lib/discord";
import { notifyUser } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requireAdmin();
  if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });

  const { id } = await params;
  const { action, adminNote } = await req.json(); // 'approve' | 'reject'
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action 'approve' və ya 'reject' olmalıdır" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: request } = await admin
    .from("bank_deposit_requests")
    .select("id, user_id, amount, status")
    .eq("id", id)
    .maybeSingle();

  if (!request || request.status !== "pending") {
    return NextResponse.json({ error: "Tələb tapılmadı və ya artıq həll olunub" }, { status: 400 });
  }

  if (action === "approve") {
    const gross = Number(request.amount);
    const fee = Math.round(gross * 0.1 * 100) / 100;
    const net = Math.round((gross - fee) * 100) / 100;

    const { data: profile } = await admin
      .from("profiles").select("wallet_balance, username").eq("id", request.user_id).maybeSingle();
    await admin
      .from("profiles")
      .update({ wallet_balance: Number(profile?.wallet_balance ?? 0) + net })
      .eq("id", request.user_id);

    await admin.from("ledger").insert([
      { user_id: request.user_id, type: "deposit", amount: gross, note: "Bank köçürməsi (admin təsdiqi)" },
      { user_id: request.user_id, type: "platform_fee", amount: -fee, note: "Platform komissiyası (10%)" },
    ]);

    await notifyUser(admin, request.user_id, "Balansınız artırıldı", `Bank köçürməniz təsdiqləndi. Balansınıza <b>${net.toFixed(2)} ₼</b> əlavə olundu.`);
    await logToDiscord("deposit", `✅ Bank köçürməsi təsdiqləndi: @${profile?.username ?? request.user_id} — ${gross.toFixed(2)} ₼ (net ${net.toFixed(2)} ₼)`);
  } else {
    await notifyUser(admin, request.user_id, "Bank köçürməsi rədd edildi", `Köçürmə tələbiniz təsdiqlənmədi.${adminNote ? ` Səbəb: ${adminNote}` : ""} Suallarınız üçün dəstəklə əlaqə saxlayın.`);
    await logToDiscord("deposit", `❌ Bank köçürməsi rədd edildi (#${id.slice(0, 8)})`);
  }

  await admin
    .from("bank_deposit_requests")
    .update({ status: action === "approve" ? "approved" : "rejected", admin_note: adminNote ?? null })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
