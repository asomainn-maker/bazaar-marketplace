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
  const { action } = await req.json(); // 'refund' | 'release'
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, buyer_id, seller_id, amount, status")
    .eq("id", id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "Sifariş tapılmadı" }, { status: 404 });
  if (!["paid", "delivered", "disputed"].includes(order.status)) {
    return NextResponse.json({ error: "Bu sifariş üzərində əməliyyat edilə bilməz" }, { status: 400 });
  }

  if (action === "refund") {
    const { data: buyerProfile } = await admin.from("profiles").select("wallet_balance").eq("id", order.buyer_id).maybeSingle();
    await admin.from("profiles").update({ wallet_balance: Number(buyerProfile?.wallet_balance ?? 0) + Number(order.amount) }).eq("id", order.buyer_id);
    await admin.from("ledger").insert({ user_id: order.buyer_id, order_id: order.id, type: "refund", amount: Number(order.amount), note: "Admin: məcburi geri qaytarma" });
    await admin.from("orders").update({ status: "refunded" }).eq("id", id);
  } else if (action === "release") {
    const { data: sellerProfile } = await admin.from("profiles").select("wallet_balance").eq("id", order.seller_id).maybeSingle();
    await admin.from("profiles").update({ wallet_balance: Number(sellerProfile?.wallet_balance ?? 0) + Number(order.amount) }).eq("id", order.seller_id);
    await admin.from("ledger").insert({ user_id: order.seller_id, order_id: order.id, type: "escrow_release", amount: Number(order.amount), note: "Admin: məcburi buraxma" });
    await admin.from("orders").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
  } else {
    return NextResponse.json({ error: "action 'refund' və ya 'release' olmalıdır" }, { status: 400 });
  }

  await admin
    .from("tickets")
    .update({ status: action === "refund" ? "resolved_buyer" : "resolved_seller", resolved_at: new Date().toISOString() })
    .eq("order_id", id)
    .eq("status", "open");

  return NextResponse.json({ ok: true });
}
