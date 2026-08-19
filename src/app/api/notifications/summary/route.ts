import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ unread: 0 });

  const admin = createAdminClient();

  const { data: myConvos } = await admin
    .from("conversations")
    .select("id")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
  const convoIds = (myConvos ?? []).map((c) => c.id);

  let unreadMessages = 0;
  if (convoIds.length > 0) {
    const { count } = await admin
      .from("direct_messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", convoIds)
      .eq("read", false)
      .neq("sender_id", user.id);
    unreadMessages = count ?? 0;
  }

  let openTickets = 0;
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (profile?.is_admin) {
    const { count } = await admin
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");
    openTickets = count ?? 0;
  }

  return NextResponse.json({ unread: unreadMessages + openTickets });
}
