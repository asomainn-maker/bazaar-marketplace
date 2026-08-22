import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/email";

async function getOrCreateConversation(
  admin: ReturnType<typeof createAdminClient>,
  buyerId: string,
  sellerId: string,
  listingId: string
) {
  const { data: existing } = await admin
    .from("conversations")
    .select("id")
    .eq("buyer_id", buyerId)
    .eq("seller_id", sellerId)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created } = await admin
    .from("conversations")
    .insert({ buyer_id: buyerId, seller_id: sellerId, listing_id: listingId })
    .select("id")
    .single();
  return created?.id ?? null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { listing_id } = await req.json();
  if (!listing_id) return NextResponse.json({ error: "listing_id tələb olunur" }, { status: 400 });

  const admin = createAdminClient();

  const { data: listing } = await admin
    .from("listings")
    .select("id, seller_id, price, status, title, is_auto_delivery")
    .eq("id", listing_id)
    .maybeSingle();

  if (!listing || listing.status !== "active") {
    return NextResponse.json({ error: "Elan artıq aktiv deyil" }, { status: 400 });
  }
  if (listing.seller_id === user.id) {
    return NextResponse.json({ error: "Öz elanınızı ala bilməzsiniz" }, { status: 400 });
  }

  const { data: buyerProfile } = await admin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", user.id)
    .maybeSingle();

  const balance = Number(buyerProfile?.wallet_balance ?? 0);
  if (balance < Number(listing.price)) {
    return NextResponse.json({ error: "Balansınız kifayət etmir. Əvvəlcə balans artırın." }, { status: 400 });
  }

  let deliveryItemId: string | null = null;
  let deliveryContent: string | null = null;

  if (listing.is_auto_delivery) {
    // Bir stok elementini kilidlə (başqasına verilməsin deyə).
    const { data: item } = await admin
      .from("listing_delivery_items")
      .select("id, content")
      .eq("listing_id", listing_id)
      .eq("delivered", false)
      .limit(1)
      .maybeSingle();

    if (!item) {
      return NextResponse.json({ error: "Stokda məhsul qalmayıb" }, { status: 400 });
    }

    const { data: lockedItem } = await admin
      .from("listing_delivery_items")
      .update({ delivered: true })
      .eq("id", item.id)
      .eq("delivered", false)
      .select("id")
      .maybeSingle();

    if (!lockedItem) {
      return NextResponse.json({ error: "Stok başqası tərəfindən alındı, yenidən cəhd edin" }, { status: 400 });
    }

    deliveryItemId = item.id;
    deliveryContent = item.content;

    // Stokda başqa element qalıbmı yoxla.
    const { count: remaining } = await admin
      .from("listing_delivery_items")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listing_id)
      .eq("delivered", false);

    if ((remaining ?? 0) === 0) {
      await admin.from("listings").update({ status: "sold" }).eq("id", listing_id);
    }
  } else {
    // Tək-satışlı elan: dərhal kilidlə.
    const { data: lockedListing } = await admin
      .from("listings")
      .update({ status: "sold" })
      .eq("id", listing_id)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (!lockedListing) {
      return NextResponse.json({ error: "Elan artıq başqası tərəfindən alınıb" }, { status: 400 });
    }
  }

  const now = new Date();
  const autoRelease = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      amount: listing.price,
      status: listing.is_auto_delivery ? "delivered" : "paid",
      delivered_at: listing.is_auto_delivery ? now.toISOString() : null,
      auto_release_at: listing.is_auto_delivery ? autoRelease.toISOString() : null,
    })
    .select("id, status, amount, created_at")
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 400 });
  }

  if (deliveryItemId) {
    await admin.from("listing_delivery_items").update({ order_id: order.id }).eq("id", deliveryItemId);
  }

  await admin
    .from("profiles")
    .update({ wallet_balance: balance - Number(listing.price) })
    .eq("id", user.id);

  await admin.from("ledger").insert({
    user_id: user.id,
    order_id: order.id,
    type: "escrow_lock",
    amount: -Number(listing.price),
    note: "Elan üçün ödəniş, escrow-da saxlanılır",
  });

  // Çat konfrasında sifariş barədə avtomatik məlumat (və avtomatik təslimatda kod).
  const conversationId = await getOrCreateConversation(admin, user.id, listing.seller_id, listing_id);
  if (conversationId) {
    const orderInfoMsg = `🛒 Sifariş yaradıldı: "${listing.title}" — ${Number(listing.price).toFixed(2)} ₼. Sifariş detalları: /dashboard/orders/${order.id}`;
    await admin.from("direct_messages").insert({ conversation_id: conversationId, sender_id: user.id, body: orderInfoMsg });

    if (deliveryContent) {
      await admin.from("direct_messages").insert({
        conversation_id: conversationId,
        sender_id: listing.seller_id,
        body: `📦 Avtomatik təslimat:\n${deliveryContent}`,
      });
    }
  }

  await notifyUser(admin, user.id, "Sifariş qəbul edildi", `<b>${listing.title}</b> üçün ${Number(listing.price).toFixed(2)} ₼ ödədiniz. ${listing.is_auto_delivery ? "Məhsul avtomatik olaraq çat bölməsinə göndərildi." : "Pul satıcı təhvil verib siz təsdiqləyənə qədər qorunmada saxlanılır."}`);
  await notifyUser(admin, listing.seller_id, "Yeni sifariş", `<b>${listing.title}</b> elanınız ${Number(listing.price).toFixed(2)} ₼-a satıldı.${listing.is_auto_delivery ? "" : " Zəhmət olmasa məhsulu təhvil verib \"Təslim etdim\" düyməsinə basın."}`);

  return NextResponse.json({ order });
}
