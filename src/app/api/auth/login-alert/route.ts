import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/email";
import { lookupGeo, getClientIp } from "@/lib/geo";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const ip = getClientIp(req.headers);
  const { country, city } = await lookupGeo(ip);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://itembazar.online";

  const admin = createAdminClient();
  await notifyUser(
    admin,
    user.id,
    "Hesabınıza yeni giriş aşkarlandı",
    `Hesabınıza <b>${ip}</b> IP ünvanından giriş edildi.<br/>Ölkə: <b>${country}</b><br/>Şəhər: <b>${city}</b><br/><br/>Bu siz deyilsinizsə, dərhal şifrənizi dəyişin: <a href="${site}/forgot-password">Şifrəni dəyiş</a>`
  );

  return NextResponse.json({ ok: true });
}
