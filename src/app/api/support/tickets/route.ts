import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdmin } from "@/lib/email";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const admin = createAdminClient();
  const { data: tickets } = await admin
    .from("tickets")
    .select("id, status, created_at, order_id")
    .eq("opened_by", user.id)
    .order("created_at", { ascending: false });

  const withSubjects = await Promise.all(
    (tickets ?? []).map(async (t) => {
      const { data: firstMsg } = await admin
        .from("ticket_messages")
        .select("body")
        .eq("ticket_id", t.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return { ...t, subject: firstMsg?.body?.slice(0, 60) ?? "Müraciət" };
    })
  );

  return NextResponse.json({ tickets: withSubjects });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { subject, message } = await req.json();
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Mesaj boş ola bilməz" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from("tickets")
    .insert({ opened_by: user.id, order_id: null })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const fullMessage = subject ? `[${subject}] ${message.trim()}` : message.trim();
  await admin.from("ticket_messages").insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    body: fullMessage.slice(0, 2000),
  });

  await notifyAdmin("Yeni dəstək müraciəti", `İstifadəçidən yeni müraciət: "${fullMessage.slice(0, 200)}"`);

  return NextResponse.json({ ticketId: ticket.id });
}
