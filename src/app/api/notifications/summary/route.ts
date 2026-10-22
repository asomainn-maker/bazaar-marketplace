import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Item = { id: string; text: string; href: string; kind: "message" | "order" | "admin" };

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ unread: 0, items: [] });

  const admin = createAdminClient();
  const items: Item[] = [];

  // 1) Oxunmamış mesajlar
  const { data: myConvos } = await admin
    .from("conversations").select("id").or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
  const convoIds = (myConvos ?? []).map((c) => c.id);
  if (convoIds.length > 0) {
    const { count } = await admin
      .from("direct_messages").select("*", { count: "exact", head: true })
      .in("conversation_id", convoIds).eq("read", false).neq("sender_id", user.id);
    if ((count ?? 0) > 0) {
      items.push({ id: "messages", text: `${count} oxunmamış mesajınız var`, href: "/dashboard/messages", kind: "message" });
    }
  }

  // 2) Alıcı kimi: təslim edilib, təsdiqiniz gözlənilir
  const { data: toConfirm } = await admin
    .from("orders").select("id, listings(title)").eq("buyer_id", user.id).eq("status", "delivered");
  for (const o of toConfirm ?? []) {
    const title = (o.listings as unknown as { title: string } | null)?.title ?? "Sifariş";
    items.push({ id: `c-${o.id}`, text: `«${title}» təslim edilib — təsdiqiniz gözlənilir`, href: `/dashboard/orders/${o.id}`, kind: "order" });
  }

  // 3) Alıcı kimi: ödənilib, satıcının təhvili gözlənilir
  const { data: waitingSeller } = await admin
    .from("orders").select("id, listings(title)").eq("buyer_id", user.id).eq("status", "paid");
  for (const o of waitingSeller ?? []) {
    const title = (o.listings as unknown as { title: string } | null)?.title ?? "Sifariş";
    items.push({ id: `w-${o.id}`, text: `«${title}» ödənildi — satıcının təhvili gözlənilir`, href: `/dashboard/orders/${o.id}`, kind: "order" });
  }

  // 4) Satıcı kimi: yeni sifariş, təhvil verin
  const { data: toDeliver } = await admin
    .from("orders").select("id, listings(title)").eq("seller_id", user.id).eq("status", "paid");
  for (const o of toDeliver ?? []) {
    const title = (o.listings as unknown as { title: string } | null)?.title ?? "Sifariş";
    items.push({ id: `d-${o.id}`, text: `Yeni sifariş: «${title}» — təhvil verin`, href: `/dashboard/orders/${o.id}`, kind: "order" });
  }

  // 5) Satıcı kimi: təslim edilib, alıcının təsdiqi gözlənilir
  const { data: sellerWaiting } = await admin
    .from("orders").select("id, listings(title)").eq("seller_id", user.id).eq("status", "delivered");
  for (const o of sellerWaiting ?? []) {
    const title = (o.listings as unknown as { title: string } | null)?.title ?? "Sifariş";
    items.push({ id: `s-${o.id}`, text: `«${title}» — alıcının təsdiqi gözlənilir`, href: `/dashboard/orders/${o.id}`, kind: "order" });
  }

  // 6) Mübahisəli sifarişlər (hər iki tərəf)
  const { data: disputed } = await admin
    .from("orders").select("id, listings(title)").or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).eq("status", "disputed");
  for (const o of disputed ?? []) {
    const title = (o.listings as unknown as { title: string } | null)?.title ?? "Sifariş";
    items.push({ id: `x-${o.id}`, text: `«${title}» üzrə mübahisə araşdırılır`, href: `/dashboard/orders/${o.id}`, kind: "order" });
  }

  // 7) Admin: gözləyən əməliyyatlar
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (profile?.is_admin) {
    const [t, w, b, p] = await Promise.all([
      admin.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
      admin.from("withdrawals").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("bank_deposit_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("profiles").select("*", { count: "exact", head: true }).not("phone", "is", null).eq("phone_verified", false),
    ]);
    const parts: string[] = [];
    if ((t.count ?? 0) > 0) parts.push(`${t.count} müraciət`);
    if ((w.count ?? 0) > 0) parts.push(`${w.count} çıxarış`);
    if ((b.count ?? 0) > 0) parts.push(`${b.count} bank köçürməsi`);
    if ((p.count ?? 0) > 0) parts.push(`${p.count} telefon təsdiqi`);
    if (parts.length > 0) items.push({ id: "admin", text: `Admin: gözləyən — ${parts.join(", ")}`, href: "/admin", kind: "admin" });
  }

  return NextResponse.json({ unread: items.length, items });
}
