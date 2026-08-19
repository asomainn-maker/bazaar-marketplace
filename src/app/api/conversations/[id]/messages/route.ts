import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function assertParticipant(
  admin: ReturnType<typeof createAdminClient>,
  conversationId: string,
  userId: string
) {
  const { data: convo } = await admin
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!convo || (convo.buyer_id !== userId && convo.seller_id !== userId)) return null;
  return convo;
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
  const convo = await assertParticipant(admin, id, user.id);
  if (!convo) return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });

  const { data: messages } = await admin
    .from("direct_messages")
    .select("id, body, sender_id, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  await admin
    .from("direct_messages")
    .update({ read: true })
    .eq("conversation_id", id)
    .neq("sender_id", user.id)
    .eq("read", false);

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
  const convo = await assertParticipant(admin, id, user.id);
  if (!convo) return NextResponse.json({ error: "Tapılmadı" }, { status: 404 });

  const { data: message, error } = await admin
    .from("direct_messages")
    .insert({ conversation_id: id, sender_id: user.id, body: body.trim().slice(0, 2000) })
    .select("id, body, sender_id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message });
}
