import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function canAccessTicket(
  admin: ReturnType<typeof createAdminClient>,
  ticketId: string,
  userId: string
) {
  const { data: ticket } = await admin
    .from("tickets")
    .select("id, opened_by, order_id")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return false;
  if (ticket.opened_by === userId) return true;

  const { data: order } = await admin
    .from("orders")
    .select("buyer_id, seller_id")
    .eq("id", ticket.order_id)
    .maybeSingle();
  if (order && (order.buyer_id === userId || order.seller_id === userId)) return true;

  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  return !!profile?.is_admin;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  if (!(await canAccessTicket(admin, id, user.id))) {
    return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
  }

  const { data: messages } = await admin
    .from("ticket_messages")
    .select("id, body, sender_id, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ messages: messages ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { id } = await params;
  const { body } = await req.json();
  if (typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "Mesaj boş ola bilməz" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!(await canAccessTicket(admin, id, user.id))) {
    return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
  }

  const { data: message, error } = await admin
    .from("ticket_messages")
    .insert({ ticket_id: id, sender_id: user.id, body: body.trim().slice(0, 2000) })
    .select("id, body, sender_id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message });
}
