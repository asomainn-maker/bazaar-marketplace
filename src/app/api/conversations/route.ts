import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const admin = createAdminClient();
  const { data: conversations } = await admin
    .from("conversations")
    .select("id, listing_id, buyer_id, seller_id, created_at, listings(title)")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const otherIds = [
    ...new Set((conversations ?? []).map((c) => (c.buyer_id === user.id ? c.seller_id : c.buyer_id))),
  ];
  let names: Record<string, string> = {};
  if (otherIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, username").in("id", otherIds);
    names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.username]));
  }

  const enriched = await Promise.all(
    (conversations ?? []).map(async (c) => {
      const otherId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
      const { data: lastMsg } = await admin
        .from("direct_messages")
        .select("body, created_at, sender_id")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { count: unread } = await admin
        .from("direct_messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", c.id)
        .eq("read", false)
        .neq("sender_id", user.id);
      return {
        id: c.id,
        otherUsername: names[otherId] ?? "istifadəçi",
        listingTitle: (c.listings as unknown as { title: string } | null)?.title ?? null,
        lastMessage: lastMsg?.body ?? null,
        lastMessageAt: lastMsg?.created_at ?? c.created_at,
        unread: unread ?? 0,
      };
    })
  );

  enriched.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  return NextResponse.json({ conversations: enriched });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { sellerId, listingId } = await req.json();
  if (!sellerId) return NextResponse.json({ error: "sellerId tələb olunur" }, { status: 400 });
  if (sellerId === user.id) return NextResponse.json({ error: "Özünüzə mesaj yaza bilməzsiniz" }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("conversations")
    .select("id")
    .eq("buyer_id", user.id)
    .eq("seller_id", sellerId)
    .eq("listing_id", listingId ?? null)
    .maybeSingle();

  if (existing) return NextResponse.json({ conversationId: existing.id });

  const { data: created, error } = await admin
    .from("conversations")
    .insert({ buyer_id: user.id, seller_id: sellerId, listing_id: listingId ?? null })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ conversationId: created.id });
}
