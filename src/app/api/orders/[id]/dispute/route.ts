import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdmin } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { id } = await params;
  const { message } = await req.json();

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, buyer_id, seller_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!order || (order.buyer_id !== user.id && order.seller_id !== user.id)) {
    return NextResponse.json({ error: "Sifariş tapılmadı" }, { status: 404 });
  }
  if (!["paid", "delivered"].includes(order.status)) {
    return NextResponse.json({ error: "Bu sifariş üçün mübahisə açıla bilməz" }, { status: 400 });
  }

  const { data: ticket, error } = await admin
    .from("tickets")
    .insert({ order_id: order.id, opened_by: user.id })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("orders").update({ status: "disputed" }).eq("id", id);

  if (typeof message === "string" && message.trim()) {
    await admin.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      body: message.trim().slice(0, 2000),
    });
  }

  await notifyAdmin("Yeni mübahisə açıldı", `Sifariş #${order.id.slice(0, 8)} üçün mübahisə açıldı. Admin panelindən baxın.`);

  return NextResponse.json({ ticket_id: ticket.id });
}
