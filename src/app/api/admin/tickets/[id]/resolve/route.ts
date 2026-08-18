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
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });

  const { id } = await params;
  const { resolution, note } = await req.json();
  if (!["buyer", "seller"].includes(resolution)) {
    return NextResponse.json({ error: "resolution 'buyer' və ya 'seller' olmalıdır" }, { status: 400 });
  }

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, order_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!ticket) return NextResponse.json({ error: "Ticket tapılmadı" }, { status: 404 });
  if (ticket.status !== "open") return NextResponse.json({ error: "Ticket artıq həll olunub" }, { status: 400 });

  const { data: order } = await admin
    .from("orders")
    .select("id, buyer_id, seller_id, amount, status")
    .eq("id", ticket.order_id)
    .maybeSingle();
  if (!order || order.status !== "disputed") {
    return NextResponse.json({ error: "Sifariş mübahisəli statusda deyil" }, { status: 400 });
  }

  if (resolution === "buyer") {
    const { data: buyerProfile } = await admin
      .from("profiles").select("wallet_balance").eq("id", order.buyer_id).maybeSingle();
    const newBalance = Number(buyerProfile?.wallet_balance ?? 0) + Number(order.amount);
    await admin.from("profiles").update({ wallet_balance: newBalance }).eq("id", order.buyer_id);
    await admin.from("ledger").insert({
      user_id: order.buyer_id, order_id: order.id, type: "refund",
      amount: Number(order.amount), note: "Admin qərarı: alıcıya geri qaytarıldı",
    });
    await admin.from("orders").update({ status: "refunded" }).eq("id", order.id);
  } else {
    const { data: sellerProfile } = await admin
      .from("profiles").select("wallet_balance").eq("id", order.seller_id).maybeSingle();
    const newBalance = Number(sellerProfile?.wallet_balance ?? 0) + Number(order.amount);
    await admin.from("profiles").update({ wallet_balance: newBalance }).eq("id", order.seller_id);
    await admin.from("ledger").insert({
      user_id: order.seller_id, order_id: order.id, type: "escrow_release",
      amount: Number(order.amount), note: "Admin qərarı: satıcıya ödənildi",
    });
    await admin.from("orders").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", order.id);
  }

  await admin
    .from("tickets")
    .update({
      status: resolution === "buyer" ? "resolved_buyer" : "resolved_seller",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (typeof note === "string" && note.trim()) {
    await admin.from("ticket_messages").insert({
      ticket_id: id, sender_id: user.id, body: `[Admin qərarı] ${note.trim()}`,
    });
  }

  return NextResponse.json({ ok: true });
}
