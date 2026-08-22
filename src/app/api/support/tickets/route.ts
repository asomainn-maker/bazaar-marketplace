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
    .select("id, status, category, created_at")
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

const CATEGORY_LABELS: Record<string, string> = {
  report_listing: "Elanı report etmək",
  report_user: "İstifadəçini report etmək",
  feedback: "Sayt haqqında fikir/tövsiyə",
  problem_encountered: "Problemlə qarşılaşmaq",
  other: "Digər",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { category, message, listingId, targetUserId } = await req.json();
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Mesaj boş ola bilməz" }, { status: 400 });
  }
  if (!CATEGORY_LABELS[category]) {
    return NextResponse.json({ error: "Kateqoriya düzgün deyil" }, { status: 400 });
  }
  if (category === "report_listing" && !listingId) {
    return NextResponse.json({ error: "Elan seçin" }, { status: 400 });
  }
  if (category === "report_user" && !targetUserId) {
    return NextResponse.json({ error: "İstifadəçi seçin" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from("tickets")
    .insert({
      opened_by: user.id,
      order_id: null,
      category,
      listing_id: category === "report_listing" ? listingId : null,
      target_user_id: category === "report_user" ? targetUserId : null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("ticket_messages").insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    body: message.trim().slice(0, 2000),
  });

  await notifyAdmin(
    `Yeni dəstək müraciəti: ${CATEGORY_LABELS[category]}`,
    `${message.trim().slice(0, 200)}`
  );

  return NextResponse.json({ ticketId: ticket.id });
}
