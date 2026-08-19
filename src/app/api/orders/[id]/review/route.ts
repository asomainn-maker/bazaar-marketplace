import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { id } = await params;
  const { rating, body } = await req.json();
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return NextResponse.json({ error: "Reytinq 1-5 arasında olmalıdır" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, buyer_id, seller_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!order || order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Sifariş tapılmadı" }, { status: 404 });
  }
  if (order.status !== "completed") {
    return NextResponse.json({ error: "Yalnız tamamlanmış sifarişlərə rəy yazıla bilər" }, { status: 400 });
  }

  const { data: review, error } = await admin
    .from("reviews")
    .insert({
      order_id: order.id,
      reviewer_id: user.id,
      reviewee_id: order.seller_id,
      rating: numericRating,
      body: typeof body === "string" ? body.trim().slice(0, 1000) : null,
    })
    .select("id, rating, body, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Bu sifarişə artıq rəy yazılıb" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ review });
}
