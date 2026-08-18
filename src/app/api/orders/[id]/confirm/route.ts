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
    .select("id, buyer_id, seller_id, amount, status")
    .eq("id", id)
    .maybeSingle();

  if (!order || order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Sifariş tapılmadı" }, { status: 404 });
  }
  if (order.status !== "delivered") {
    return NextResponse.json({ error: "Sifariş hələ təslim edilməyib" }, { status: 400 });
  }

  const { data: sellerProfile } = await admin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", order.seller_id)
    .maybeSingle();

  const newBalance = Number(sellerProfile?.wallet_balance ?? 0) + Number(order.amount);

  await admin.from("profiles").update({ wallet_balance: newBalance }).eq("id", order.seller_id);
  await admin.from("ledger").insert({
    user_id: order.seller_id,
    order_id: order.id,
    type: "escrow_release",
    amount: Number(order.amount),
    note: "Alıcı təslimatı təsdiqlədi",
  });

  const { error } = await admin
    .from("orders")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
