import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { listing_id } = await req.json();
  if (!listing_id) return NextResponse.json({ error: "listing_id tələb olunur" }, { status: 400 });

  const admin = createAdminClient();

  const { data: listing } = await admin
    .from("listings")
    .select("id, seller_id, price, status")
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

  // Lock the listing first to avoid double-selling.
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

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      amount: listing.price,
      status: "paid",
    })
    .select("id, status, amount, created_at")
    .single();

  if (orderError) {
    // Roll back listing lock on failure.
    await admin.from("listings").update({ status: "active" }).eq("id", listing_id);
    return NextResponse.json({ error: orderError.message }, { status: 400 });
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

  return NextResponse.json({ order });
}
