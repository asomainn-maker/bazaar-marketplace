import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { title, description, price, category_id, image_url, is_auto_delivery, delivery_content } = await req.json();
  if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
    return NextResponse.json({ error: "Başlıq 1-120 simvol olmalıdır" }, { status: 400 });
  }
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return NextResponse.json({ error: "Qiymət düzgün deyil" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (!(await checkRateLimit(admin, user.id, "create_listing", 8, 3600))) {
    return NextResponse.json({ error: "Çox tez-tez elan yaradırsınız. Bir az sonra yenidən cəhd edin." }, { status: 429 });
  }

  const { data: sellerProfile } = await admin
    .from("profiles")
    .select("phone, phone_verified, can_list")
    .eq("id", user.id)
    .maybeSingle();
  if (sellerProfile?.can_list === false) {
    return NextResponse.json({ error: "Admin sizin elan yerləşdirmə icazənizi bloklayıb" }, { status: 403 });
  }
  if (!sellerProfile?.phone_verified) {
    return NextResponse.json(
      {
        error: sellerProfile?.phone
          ? "Telefon nömrəniz hələ admin tərəfindən təsdiqlənməyib"
          : "Elan yerləşdirmək üçün əvvəlcə telefon nömrənizi göndərin",
        code: "phone_not_verified",
      },
      { status: 403 }
    );
  }
  let deliveryLines: string[] = [];
  if (is_auto_delivery) {
    if (typeof delivery_content !== "string" || !delivery_content.trim()) {
      return NextResponse.json({ error: "Avtomatik təslimat üçün ən azı 1 kod yazın" }, { status: 400 });
    }
    deliveryLines = delivery_content.split("\n").map((l: string) => l.trim()).filter(Boolean);
    if (deliveryLines.length === 0) {
      return NextResponse.json({ error: "Ən azı 1 kod tələb olunur" }, { status: 400 });
    }
  }

  const { data: listing, error } = await admin
    .from("listings")
    .insert({
      seller_id: user.id,
      title: title.trim(),
      description: typeof description === "string" ? description.trim().slice(0, 2000) : null,
      price: numericPrice,
      category_id: category_id || null,
      image_url: typeof image_url === "string" && image_url ? image_url : null,
      is_auto_delivery: !!is_auto_delivery,
    })
    .select("id, title, description, price, status, image_url, is_auto_delivery, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (is_auto_delivery && deliveryLines.length > 0) {
    await admin.from("listing_delivery_items").insert(
      deliveryLines.map((content) => ({ listing_id: listing.id, content }))
    );
  }

  return NextResponse.json({ listing });
}
