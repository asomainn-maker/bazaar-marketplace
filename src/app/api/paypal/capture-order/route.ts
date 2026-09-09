import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { capturePaypalOrder } from "@/lib/paypal";
import { logToDiscord } from "@/lib/discord";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token"); // PayPal order id
  const origin = req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${origin}/dashboard/wallet?error=missing_token`);
  }

  const admin = createAdminClient();
  const { data: deposit } = await admin
    .from("deposits")
    .select("id, user_id, gross_amount, fee_amount, net_amount, status")
    .eq("provider_ref", token)
    .maybeSingle();

  if (!deposit) {
    return NextResponse.redirect(`${origin}/dashboard/wallet?error=deposit_not_found`);
  }
  if (deposit.status === "completed") {
    return NextResponse.redirect(`${origin}/dashboard/wallet?success=1`);
  }

  try {
    const { status, cardLast4 } = await capturePaypalOrder(token);
    if (status !== "COMPLETED") {
      await admin.from("deposits").update({ status: "failed" }).eq("id", deposit.id);
      return NextResponse.redirect(`${origin}/dashboard/wallet?error=not_completed`);
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("wallet_balance, username")
      .eq("id", deposit.user_id)
      .maybeSingle();

    const newBalance = Number(profile?.wallet_balance ?? 0) + Number(deposit.net_amount);
    await admin.from("profiles").update({ wallet_balance: newBalance }).eq("id", deposit.user_id);

    await admin.from("ledger").insert([
      {
        user_id: deposit.user_id,
        type: "deposit",
        amount: Number(deposit.gross_amount),
        note: "PayPal depozit",
      },
      {
        user_id: deposit.user_id,
        type: "platform_fee",
        amount: -Number(deposit.fee_amount),
        note: "Platform komissiyası (10%)",
      },
    ]);

    await admin.from("deposits").update({ status: "completed", card_last4: cardLast4 }).eq("id", deposit.id);

    await logToDiscord(
      "deposit",
      `💳 @${profile?.username ?? deposit.user_id} PayPal ilə balans artırdı: ${Number(deposit.gross_amount).toFixed(2)} ₼ (net ${Number(deposit.net_amount).toFixed(2)} ₼)${cardLast4 ? ` — kart: **** ${cardLast4}` : ""}`
    );

    return NextResponse.redirect(`${origin}/dashboard/wallet?success=1`);
  } catch {
    await admin.from("deposits").update({ status: "failed" }).eq("id", deposit.id);
    return NextResponse.redirect(`${origin}/dashboard/wallet?error=capture_failed`);
  }
}
