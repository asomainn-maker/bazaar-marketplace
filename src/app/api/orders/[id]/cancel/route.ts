import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, buyer_id, seller_id, amount, status, listing_id")
    .eq("id", id)
    .maybeSingle();

  if (!order || order.seller_id !== user.id) {
    return NextResponse.json({ error: "Sifariş tapılmadı" }, { status: 404 });
  }
  if (order.status !== "paid") {
    return NextResponse.json({ error: "Yalnız hələ təslim edilməmiş sifariş ləğv oluna bilər" }, { status: 400 });
  }

  const { data: buyerProfile } = await admin
    .from("profiles").select("wallet_balance").eq("id", order.buyer_id).maybeSingle();
  const newBalance = Number(buyerProfile?.wallet_balance ?? 0) + Number(order.amount);
  await admin.from("profiles").update({ wallet_balance: newBalance }).eq("id", order.buyer_id);
  await admin.from("ledger").insert({
    user_id: order.buyer_id, order_id: order.id, type: "refund",
    amount: Number(order.amount), note: "Satıcı imtina etdi, balans geri qaytarıldı",
  });

  await admin.from("orders").update({ status: "cancelled" }).eq("id", id);
  if (order.listing_id) {
    await admin.from("listings").update({ status: "active" }).eq("id", order.listing_id);
  }

  return NextResponse.json({ ok: true });
}
