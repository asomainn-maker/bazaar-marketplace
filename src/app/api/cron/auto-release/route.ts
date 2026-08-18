import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "İcazə yoxdur" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: dueOrders } = await admin
    .from("orders")
    .select("id, seller_id, amount")
    .eq("status", "delivered")
    .lte("auto_release_at", new Date().toISOString());

  let released = 0;
  for (const order of dueOrders ?? []) {
    const { data: sellerProfile } = await admin
      .from("profiles").select("wallet_balance").eq("id", order.seller_id).maybeSingle();
    const newBalance = Number(sellerProfile?.wallet_balance ?? 0) + Number(order.amount);
    await admin.from("profiles").update({ wallet_balance: newBalance }).eq("id", order.seller_id);
    await admin.from("ledger").insert({
      user_id: order.seller_id, order_id: order.id, type: "escrow_release",
      amount: Number(order.amount), note: "Avtomatik buraxma (müddət bitdi)",
    });
    await admin
      .from("orders")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", order.id);
    released++;
  }

  return NextResponse.json({ released });
}
