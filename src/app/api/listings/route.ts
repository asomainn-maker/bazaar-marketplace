import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });

  const { title, description, price, category_id, image_url } = await req.json();
  if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
    return NextResponse.json({ error: "Başlıq 1-120 simvol olmalıdır" }, { status: 400 });
  }
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    return NextResponse.json({ error: "Qiymət düzgün deyil" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: sellerProfile } = await admin
    .from("profiles")
    .select("phone, phone_verified")
    .eq("id", user.id)
    .maybeSingle();
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
  const { data: listing, error } = await admin
    .from("listings")
    .insert({
      seller_id: user.id,
      title: title.trim(),
      description: typeof description === "string" ? description.trim().slice(0, 2000) : null,
      price: numericPrice,
      category_id: category_id || null,
      image_url: typeof image_url === "string" && image_url ? image_url : null,
    })
    .select("id, title, description, price, status, image_url, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ listing });
}
